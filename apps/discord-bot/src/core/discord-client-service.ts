import { Client, GatewayIntentBits } from "discord.js";
import { Context, Effect, Layer } from "effect";

// Low-level Discord client service - provides raw Discord.js client instance
const createDiscordClientService = Effect.succeed(
	new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMessageReactions,
		],
	}),
);

export class DiscordClient extends Context.Tag("DiscordClient")<
	DiscordClient,
	Effect.Effect.Success<typeof createDiscordClientService>
>() {}

export const DiscordClientLayer = Layer.effect(
	DiscordClient,
	createDiscordClientService,
);
