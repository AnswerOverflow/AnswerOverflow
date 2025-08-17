import type { DiscordGateway as DiscordGatewayService } from "dfx/DiscordGateway";
import { DiscordGateway, TypeId } from "dfx/DiscordGateway";
import type { RunningShard } from "dfx/DiscordGateway/Shard";
import type * as Discord from "dfx/types";
import { Context, Effect, HashSet, Layer, Stream } from "effect";

type AnyEffect = Effect.Effect<unknown, unknown, unknown>;

export type MockGateway = DiscordGatewayService & {
	emit: <K extends `${Discord.GatewayDispatchEvents}`>(
		event: K,
		data: Extract<
			Discord.DistributedGatewayDispatchPayload,
			{ readonly t: K }
		>["d"],
	) => Effect.Effect<void>;
};

const gateway: Effect.Effect<MockGateway, never, never> = Effect.gen(
	function* () {
		const handlers = new Map<string, Array<(data: unknown) => AnyEffect>>();
		// Track per-event readiness so emits wait for at least one handler registration
		const eventReady = new Map<string, Effect.Latch>();

		const getOrCreateDeferred = (event: string) =>
			Effect.gen(function* () {
				const existing = eventReady.get(event);
				if (existing) return existing;
				const created = yield* Effect.makeLatch();
				eventReady.set(event, created);
				return created;
			});

		const gateway = DiscordGateway.of({
			[TypeId]: TypeId,
			dispatch: Stream.empty,
			fromDispatch: (_event) => Stream.empty,
			handleDispatch: (event, handle) =>
				Effect.gen(function* () {
					const list = handlers.get(event) ?? [];
					list.push(handle as (data: unknown) => AnyEffect);
					handlers.set(event, list);
					const ready = yield* getOrCreateDeferred(event);
					yield* ready.release;
					return yield* Effect.never;
				}),
			send: (_payload: Discord.GatewaySendPayload) => Effect.succeed(true),
			shards: Effect.succeed(HashSet.empty<RunningShard>()),
		});

		const emit = <K extends `${Discord.GatewayDispatchEvents}`>(
			event: K,
			data: Extract<
				Discord.DistributedGatewayDispatchPayload,
				{ readonly t: K }
			>["d"],
		) =>
			Effect.gen(function* () {
				// Wait until at least one handler has registered for this event
				const ready = yield* getOrCreateDeferred(event);
				yield* ready.await;
				yield* Effect.forEach(
					handlers.get(event) ?? [],
					(handler) => handler(data),
					{ discard: true },
				);
			});

		return {
			...gateway,
			emit,
		} as MockGateway;
	},
);

export class DiscordGatewayMock extends Context.Tag("DiscordGatewayMock")<
	DiscordGatewayMock,
	Effect.Effect.Success<typeof gateway>
>() {}

export const MockDiscordGatewaySharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* gateway;
		return Context.make(DiscordGatewayMock, service).pipe(
			Context.add(DiscordGateway, service),
		);
	}),
);
