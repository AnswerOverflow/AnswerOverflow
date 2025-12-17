import { Client, GatewayIntentBits, Partials } from "discord.js";
import { Context, Effect, Layer } from "effect";

const createDiscordClientService = Effect.succeed(
	new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMessageReactions,
		],
		partials: [
			Partials.Message,
			Partials.Channel,
			Partials.GuildMember,
			Partials.User,
			Partials.Reaction,
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
