import { ReacordLive } from "@packages/reacord";
import { Effect, Layer, Runtime } from "effect";
import { DiscordClient } from "./discord-client-service";

export const ReacordLayer = Layer.unwrapEffect(
	Effect.gen(function* () {
		const client = yield* DiscordClient;
		const runtime = yield* Effect.runtime<DiscordClient>();

		const runEffect = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
			Runtime.runPromise(runtime)(
				effect as unknown as Effect.Effect<A, E, DiscordClient>,
			);

		return ReacordLive(client, {}, runEffect);
	}),
);
