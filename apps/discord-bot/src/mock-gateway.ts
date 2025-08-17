import type { DiscordGateway as DiscordGatewayService } from "dfx/DiscordGateway";
import { DiscordGateway, TypeId } from "dfx/DiscordGateway";
import type { RunningShard } from "dfx/DiscordGateway/Shard";
import type * as Discord from "dfx/types";
import { Context } from "effect";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";

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

		const gateway = DiscordGateway.of({
			[TypeId]: TypeId,
			dispatch: Stream.empty,
			fromDispatch: (_event) => Stream.empty,
			handleDispatch: (event, handle) =>
				Effect.suspend(() => {
					const list = handlers.get(event) ?? [];
					list.push(handle as (data: unknown) => AnyEffect);
					handlers.set(event, list);
					return Effect.never;
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
				yield* Effect.forEach(
					handlers.get(event) ?? [],
					(handler) => handler(data),
					{
						discard: true,
					},
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
