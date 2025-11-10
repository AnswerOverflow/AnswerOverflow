import { Client, type ClientEvents, GatewayIntentBits } from "discord.js";
import { Config, Context, Effect, Layer, Runtime } from "effect";
import {
	DiscordClient,
	type DiscordClientService,
	DiscordError,
} from "./discord-client";

const createRealService = Effect.gen(function* () {
	const token = yield* Config.string("DISCORD_BOT_TOKEN");

	// Initialize Discord.js client with required intents
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	// Login to Discord - called explicitly by the user
	const login = () =>
		Effect.gen(function* () {
			yield* Effect.tryPromise({
				try: () => client.login(token),
				catch: (cause) => new DiscordError({ cause }),
			});

			// Wait for client to be ready
			yield* Effect.async<void, DiscordError>((resume) => {
				client.once("clientReady", () => {
					resume(Effect.void);
				});
				client.once("error", (error) => {
					resume(Effect.fail(new DiscordError({ cause: error })));
				});
			});
		});

	const getGuild = (id: string) =>
		Effect.try({
			try: () => {
				const guild = client.guilds.cache.get(id);
				return guild ?? null;
			},
			catch: (cause) => new DiscordError({ cause }),
		});

	const getGuilds = () =>
		Effect.try({
			try: () => Array.from(client.guilds.cache.values()),
			catch: (cause) => new DiscordError({ cause }),
		});

	const getChannel = (id: string) =>
		Effect.try({
			try: () => {
				const channel = client.channels.cache.get(id);
				return channel ?? null;
			},
			catch: (cause) => new DiscordError({ cause }),
		});

	const getChannels = (guildId: string) =>
		Effect.try({
			try: () => {
				const guild = client.guilds.cache.get(guildId);
				if (!guild) return [];
				return Array.from(guild.channels.cache.values());
			},
			catch: (cause) => new DiscordError({ cause }),
		});

	const on = <E extends keyof ClientEvents, Err = never, Req = never>(
		event: E,
		handler: (...args: ClientEvents[E]) => Effect.Effect<void, Err, Req>,
	): Effect.Effect<() => void, DiscordError, Req> =>
		Effect.gen(function* () {
			// Capture the runtime - the type system ensures Req is available here
			const runtime: Runtime.Runtime<Req> = yield* Effect.runtime<Req>();

			const listener = (...args: ClientEvents[E]) => {
				// Run the handler Effect in a scoped context to handle resource cleanup
				// Effect.scoped provides a Scope and removes it from the requirements
				Runtime.runFork(runtime)(Effect.scoped(handler(...args)));
			};

			client.on(event, listener);

			// Return cleanup function
			return () => {
				client.off(event, listener);
			};
		});

	const service: DiscordClientService = {
		getGuild,
		getGuilds,
		getChannel,
		getChannels,
		on,
		login,
	};

	return service;
});

export class DiscordClientReal extends Context.Tag("DiscordClientReal")<
	DiscordClientReal,
	Effect.Effect.Success<typeof createRealService>
>() {}

export const DiscordClientRealLayer = Layer.effect(
	DiscordClient,
	createRealService,
);
