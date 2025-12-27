import { type Reacord, ReacordLive } from "@packages/reacord";
import type { Client } from "discord.js";
import { Effect, Layer } from "effect";
import { DiscordClient } from "./discord-client-service";

export const ReacordLayer: Layer.Layer<Reacord, never, DiscordClient> =
	Layer.unwrapEffect(
		Effect.gen(function* () {
			const client = yield* DiscordClient;
			return ReacordLive(client, {});
		}),
	);

export const createReacordLayerFromClient = (
	client: Client,
): Layer.Layer<Reacord> => ReacordLive(client, {});
