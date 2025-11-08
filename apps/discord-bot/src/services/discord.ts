import { Client, type ClientEvents, GatewayIntentBits } from "discord.js";
import { Context, Effect, Layer } from "effect";

const createDiscordService = Effect.gen(function* () {
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	const getGuild = (guildId: string) => {
		return Effect.tryPromise({
			try: async () => {
				const cached = client.guilds.cache.get(guildId);
				if (cached) return cached;
				const fetched = await client.guilds.fetch(guildId);
				client.guilds.cache.set(guildId, fetched);
				return fetched;
			},
			catch: (error) => Effect.die(error),
		});
	};

	const on = <K extends keyof ClientEvents>(
		event: K,
		listener: (...args: ClientEvents[K]) => void,
	) => {
		client.on(event, listener);
	};

	const effectOn = <K extends keyof ClientEvents, A, E>(
		event: K,
		listener: (...args: ClientEvents[K]) => Effect.Effect<A, E, never>,
	) => {
		client.on(event, (...args) => {
			listener(...args).pipe(Effect.runPromise);
		});
	};
	return { client, getGuild, on, effectOn };
});

export class DiscordClient extends Context.Tag("DiscordClient")<
	DiscordClient,
	Effect.Effect.Success<typeof createDiscordService>
>() {}

export const DiscordClientLayer = Layer.effect(
	DiscordClient,
	createDiscordService,
);
