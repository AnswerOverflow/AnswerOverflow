/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
import type * as HttpClient from "@effect/platform/HttpClient";
import { it } from "@effect/vitest";
import { ConvexTestLayer } from "@packages/convex/client";
import {
	DiscordGateway,
	TypeId as DiscordGatewayTypeId,
} from "dfx/DiscordGateway";
import { DiscordREST } from "dfx/DiscordREST";
import type * as Discord from "dfx/types";
import { GatewayOpcodes, type GatewayReadyDispatchData } from "dfx/types";
import * as EffectUtils from "dfx/utils/Effect";
import { Context, Effect, Layer, PubSub, Stream } from "effect";
import { make } from "./guild-parity";

const mockEventHub = Effect.gen(function* () {
	const hub = yield* Effect.acquireRelease(
		PubSub.unbounded<Discord.GatewayDispatchPayload>(),
		PubSub.shutdown,
	);
	return hub;
});

class MockEventHub extends Context.Tag("MockEventHub")<
	MockEventHub,
	Effect.Effect.Success<typeof mockEventHub>
>() {}

const test = Effect.gen(function* () {
	const hub = yield* Effect.acquireRelease(
		PubSub.unbounded<Discord.GatewayDispatchPayload>(),
		PubSub.shutdown,
	);
	const handleDispatch = handleDispatchFactory(hub);

	// yield* hub.publish({
	// 	op: GatewayOpcodes.Dispatch,
	// 	t: Discord.GatewayDispatchEvents.Ready,
	// 	d: {} as GatewayReadyDispatchData,
	// 	s: 0,
	// });
});

const handleDispatch = Effect.gen(function* () {
	return yield* Effect.never;
});

const b = Effect.gen(function* () {
	const hub = yield* MockEventHub;
}).pipe(Effect.provide(Layer.effect(MockEventHub, mockEventHub)));

const MockDiscordGateway = Layer.mock(DiscordGateway, {
	[DiscordGatewayTypeId]: DiscordGatewayTypeId,
	dispatch: Stream.empty,
	handleDispatch: (event, handle) =>
		Effect.gen(function* () {
			return yield* Effect.never;
		}),
});

const MockDiscordRest = Layer.mock(DiscordREST, {
	withFormData: () => (eff) => eff,
	withFiles: () => (eff) => eff,
	httpClient: {} as unknown as HttpClient.HttpClient,
});

it.scoped("emits READY", () =>
	make.pipe(
		Effect.provide(
			Layer.mergeAll(ConvexTestLayer, MockDiscordGateway, MockDiscordRest),
		),
	),
);
