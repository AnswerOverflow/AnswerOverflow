import type { DiscordGateway as DiscordGatewayService } from "dfx/DiscordGateway";
import { DiscordGateway, TypeId } from "dfx/DiscordGateway";
import type { RunningShard } from "dfx/DiscordGateway/Shard";
import type * as Discord from "dfx/types";
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

export const MockDiscordGateway = Layer.effect(
	DiscordGateway,
	Effect.gen(function* () {
		console.log("initiating mock gateway");
		const handlers = new Map<string, Array<(data: unknown) => AnyEffect>>();

		const emit = <K extends `${Discord.GatewayDispatchEvents}`>(
			event: K,
			data: Extract<
				Discord.DistributedGatewayDispatchPayload,
				{ readonly t: K }
			>["d"],
		) =>
			Effect.gen(function* () {
				console.log("emit", event, data, "handlers", handlers);
				yield* Effect.forEach(
					handlers.get(event) ?? [],
					(handler) => handler(data),
					{
						discard: true,
					},
				);
			});

		const gateway = DiscordGateway.of({
			[TypeId]: TypeId,
			dispatch: Stream.empty,
			fromDispatch: (_event) => Stream.empty,
			handleDispatch: (event, handle) =>
				Effect.suspend(() => {
					console.log("handleDispatch", event, handle);
					const list = handlers.get(event) ?? [];
					list.push(handle as (data: unknown) => AnyEffect);
					handlers.set(event, list);
					console.log("handleDispatch", event, "handlers", handlers);
					return Effect.never;
				}),
			send: (_payload: Discord.GatewaySendPayload) => Effect.succeed(true),
			shards: Effect.succeed(HashSet.empty<RunningShard>()),
		});

		// Test helper (not part of the real interface)
		(gateway as any).emit = emit;

		return gateway;
	}),
);
