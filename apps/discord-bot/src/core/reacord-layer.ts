import { type Reacord, ReacordLive } from "@packages/reacord";
import type { Client } from "discord.js";
import { Effect, Layer, Runtime } from "effect";
import { DiscordClient } from "./discord-client-service";

export const ReacordLayer: Layer.Layer<Reacord, never, DiscordClient> =
	Layer.unwrapEffect(
		Effect.gen(function* () {
			const client = yield* DiscordClient;
			const runtime = yield* Effect.runtime<never>();

			const runEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
				return Runtime.runPromise(runtime)(
					effect as unknown as Effect.Effect<A, never, never>,
				);
			};

			return ReacordLive(client, {}, runEffect);
		}),
	);

export const createReacordLayerFromClient = (
	client: Client,
): Layer.Layer<Reacord> =>
	Layer.unwrapEffect(
		Effect.gen(function* () {
			const runtime = yield* Effect.runtime<never>();

			const runEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
				return Runtime.runPromise(runtime)(
					effect as unknown as Effect.Effect<A, never, never>,
				);
			};

			return ReacordLive(client, {}, runEffect);
		}),
	);
