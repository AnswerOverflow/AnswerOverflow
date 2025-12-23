import { captureEffectCause } from "@packages/observability/sentry";
import {
	Chunk,
	type Duration,
	Effect,
	Fiber,
	HashMap,
	Queue,
	Ref,
	type Scope,
	Stream,
} from "effect";

export interface ChannelKeyedItem {
	readonly channelId: string;
}

export interface ChannelBatchedQueue<A extends ChannelKeyedItem> {
	readonly offer: (item: A) => Effect.Effect<boolean, never, never>;
	readonly offerAll: (
		items: Iterable<A>,
	) => Effect.Effect<boolean, never, never>;
}

interface ChannelQueue<A> {
	queue: Queue.Queue<A>;
	fiber: Fiber.RuntimeFiber<void, never>;
}

export function createChannelBatchedQueue<
	A extends ChannelKeyedItem,
	E,
	R,
>(options: {
	process: (batch: Array<A>) => Effect.Effect<void, E, R>;
	maxBatchSize: number;
	maxWait: Duration.DurationInput;
}): Effect.Effect<ChannelBatchedQueue<A>, never, R | Scope.Scope> {
	return Effect.gen(function* () {
		const scope = yield* Effect.scope;
		const runtime = yield* Effect.runtime<R>();
		const channelQueuesRef = yield* Ref.make<
			HashMap.HashMap<string, ChannelQueue<A>>
		>(HashMap.empty());

		const getOrCreateChannelQueue = (
			channelId: string,
		): Effect.Effect<Queue.Queue<A>, never, never> =>
			Effect.gen(function* () {
				const channelQueues = yield* Ref.get(channelQueuesRef);
				const existing = HashMap.get(channelQueues, channelId);

				if (existing._tag === "Some") {
					return existing.value.queue;
				}

				const queue = yield* Queue.unbounded<A>();

				const fiber = yield* Stream.fromQueue(queue).pipe(
					Stream.groupedWithin(options.maxBatchSize, options.maxWait),
					Stream.mapEffect((chunk) =>
						options.process(Chunk.toArray(chunk)).pipe(
							Effect.provide(runtime),
							Effect.catchAllCause((cause) =>
								Effect.sync(() => captureEffectCause(cause)).pipe(
									Effect.andThen(
										Effect.logError(
											`Batch processing failed for channel ${channelId}`,
											cause,
										),
									),
								),
							),
						),
					),
					Stream.runDrain,
					Effect.forkIn(scope),
				);

				yield* Ref.update(channelQueuesRef, (queues) =>
					HashMap.set(queues, channelId, { queue, fiber }),
				);

				return queue;
			});

		yield* Effect.addFinalizer(() =>
			Effect.gen(function* () {
				yield* Effect.logDebug("Shutting down channel batched queues...");
				const channelQueues = yield* Ref.get(channelQueuesRef);

				yield* Effect.forEach(
					HashMap.values(channelQueues),
					(channelQueue) =>
						Effect.gen(function* () {
							yield* Queue.shutdown(channelQueue.queue);
							yield* Fiber.await(channelQueue.fiber);
						}),
					{ concurrency: "unbounded" },
				);

				yield* Effect.logDebug("Channel batched queues shutdown complete");
			}),
		);

		return {
			offer: (item: A) =>
				Effect.gen(function* () {
					const queue = yield* getOrCreateChannelQueue(item.channelId);
					return yield* Queue.offer(queue, item);
				}),
			offerAll: (items: Iterable<A>) =>
				Effect.gen(function* () {
					const itemsByChannel = new Map<string, A[]>();
					for (const item of items) {
						const existing = itemsByChannel.get(item.channelId) ?? [];
						existing.push(item);
						itemsByChannel.set(item.channelId, existing);
					}

					yield* Effect.forEach(
						itemsByChannel.entries(),
						([channelId, channelItems]) =>
							Effect.gen(function* () {
								const queue = yield* getOrCreateChannelQueue(channelId);
								yield* Queue.offerAll(queue, channelItems);
							}),
						{ concurrency: "unbounded" },
					);

					return true;
				}),
		};
	});
}
