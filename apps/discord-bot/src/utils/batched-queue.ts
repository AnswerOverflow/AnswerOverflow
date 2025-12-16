import { captureEffectCause } from "@packages/observability/sentry";
import {
	Chunk,
	type Duration,
	Effect,
	Fiber,
	Queue,
	type Scope,
	Stream,
} from "effect";

export interface BatchedQueue<A> {
	readonly offer: (item: A) => Effect.Effect<boolean, never, never>;
	readonly offerAll: (
		items: Iterable<A>,
	) => Effect.Effect<boolean, never, never>;
}

export function createBatchedQueue<A, E, R>(options: {
	process: (batch: Array<A>) => Effect.Effect<void, E, R>;
	maxBatchSize: number;
	maxWait: Duration.DurationInput;
}): Effect.Effect<BatchedQueue<A>, never, R | Scope.Scope> {
	return Effect.gen(function* () {
		const queue = yield* Queue.unbounded<A>();
		const scope = yield* Effect.scope;

		const processingFiber = yield* Stream.fromQueue(queue).pipe(
			Stream.groupedWithin(options.maxBatchSize, options.maxWait),
			Stream.mapEffect((chunk) =>
				options
					.process(Chunk.toArray(chunk))
					.pipe(
						Effect.catchAllCause((cause) =>
							Effect.sync(() => captureEffectCause(cause)).pipe(
								Effect.andThen(
									Effect.logError("Batch processing failed", cause),
								),
							),
						),
					),
			),
			Stream.runDrain,
			Effect.forkIn(scope),
		);

		yield* Effect.addFinalizer(() =>
			Effect.gen(function* () {
				yield* Effect.logDebug("Shutting down batched queue...");
				yield* Queue.shutdown(queue);
				yield* Fiber.await(processingFiber);
				yield* Effect.logDebug("Batched queue shutdown complete");
			}),
		);

		return {
			offer: (item: A) => Queue.offer(queue, item),
			offerAll: (items: Iterable<A>) => Queue.offerAll(queue, items),
		};
	});
}
