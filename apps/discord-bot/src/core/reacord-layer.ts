import { Reacord, ReacordLive } from "@packages/reacord";
import type { Client } from "discord.js";
import { Effect, Layer, ManagedRuntime } from "effect";
import { DiscordClient } from "./discord-client-service";

export const createReacordLayer = (
	runtime: ManagedRuntime.ManagedRuntime<never, never>,
): Layer.Layer<Reacord, never, DiscordClient> =>
	Layer.unwrapEffect(
		Effect.gen(function* () {
			const client = yield* DiscordClient;

			const runEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
				return runtime.runPromise(
					effect as unknown as Effect.Effect<A, never, never>,
				);
			};

			return ReacordLive(client, {}, runEffect);
		}),
	);

export const createReacordLayerFromClient = (
	client: Client,
	runtime: ManagedRuntime.ManagedRuntime<never, never>,
): Layer.Layer<Reacord> => {
	const runEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
		return runtime.runPromise(
			effect as unknown as Effect.Effect<A, never, never>,
		);
	};

	return ReacordLive(client, {}, runEffect);
};
