import {
	ChannelType,
	Client,
	type ClientEvents,
	GatewayIntentBits,
} from "discord.js";
import {
	Array as Arr,
	Config,
	Context,
	Data,
	Effect,
	Layer,
	Runtime,
} from "effect";

export class DiscordError extends Data.TaggedError("DiscordError")<{
	cause: unknown;
}> {}

// Low-level Discord client service - provides raw Discord.js client access
const createDiscordClientService = Effect.gen(function* () {
	const token = yield* Config.string("DISCORD_BOT_TOKEN");

	// Initialize Discord.js client with required intents
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMessageReactions,
		],
	});

	// Create a .use pattern similar to database.ts
	const use = <A>(
		fn: (client: Client) => A | Promise<A>,
	): Effect.Effect<Awaited<A>, DiscordError> =>
		Effect.tryPromise({
			try: async (): Promise<Awaited<A>> => {
				const result = await fn(client);
				return result;
			},
			catch: (cause) => new DiscordError({ cause }),
		});

	// Login to Discord - called explicitly by the user
	const login = () =>
		Effect.gen(function* () {
			yield* use((c) => c.login(token));

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

	const clientService = {
		login,
		guilds: {
			cache: {
				get: (id: string) =>
					use((c) => {
						const guild = c.guilds.cache.get(id);
						return guild ?? null;
					}),
				values: () => use((c) => Arr.fromIterable(c.guilds.cache.values())),
			},
		},
		channels: {
			cache: {
				get: (id: string) =>
					use((c) => {
						const channel = c.channels.cache.get(id);
						return channel ?? null;
					}),
			},
			messages: {
				fetch: (
					channelId: string,
					options: { limit: number; after?: string },
				) =>
					use(async (c) => {
						const channel = c.channels.cache.get(channelId);
						if (!channel) {
							throw new Error(`Channel ${channelId} not found`);
						}

						if (
							channel.type !== ChannelType.GuildText &&
							channel.type !== ChannelType.GuildAnnouncement &&
							channel.type !== ChannelType.PublicThread &&
							channel.type !== ChannelType.AnnouncementThread
						) {
							throw new Error(
								`Channel ${channelId} is not a text channel or thread`,
							);
						}

						return await channel.messages.fetch({
							limit: options.limit,
							after: options.after,
						});
					}),
			},
			threads: {
				fetchActive: (forumChannelId: string) =>
					use(async (c) => {
						const channel = c.channels.cache.get(forumChannelId);
						if (!channel) {
							throw new Error(`Channel ${forumChannelId} not found`);
						}

						if (channel.type !== ChannelType.GuildForum) {
							throw new Error(
								`Channel ${forumChannelId} is not a forum channel`,
							);
						}

						return await channel.threads.fetchActive();
					}),
				fetchArchived: (forumChannelId: string, options: { before?: string }) =>
					use(async (c) => {
						const channel = c.channels.cache.get(forumChannelId);
						if (!channel) {
							throw new Error(`Channel ${forumChannelId} not found`);
						}

						if (channel.type !== ChannelType.GuildForum) {
							throw new Error(
								`Channel ${forumChannelId} is not a forum channel`,
							);
						}

						return await channel.threads.fetchArchived({
							type: "public",
							before: options.before,
						});
					}),
			},
		},
		on,
	};

	return clientService;
});

// High-level Discord service - provides convenient operations + re-exports low-level API
const createDiscordService = Effect.gen(function* () {
	const client = yield* DiscordClient;

	// High-level operations using the low-level client
	const getGuild = (id: string) => client.guilds.cache.get(id);

	const getGuilds = () => client.guilds.cache.values();

	const getChannel = (id: string) => client.channels.cache.get(id);

	const getChannels = (guildId: string) =>
		Effect.gen(function* () {
			const guild = yield* getGuild(guildId);
			if (!guild) {
				return [];
			}
			return Arr.fromIterable(guild.channels.cache.values());
		});

	const fetchChannelMessages = (
		channelId: string,
		options: { limit: number; after?: string },
	) => client.channels.messages.fetch(channelId, options);

	const fetchActiveThreads = (forumChannelId: string) =>
		client.channels.threads.fetchActive(forumChannelId);

	const fetchArchivedThreads = (
		forumChannelId: string,
		options: { before?: string },
	) => client.channels.threads.fetchArchived(forumChannelId, options);

	return {
		getGuild,
		getGuilds,
		getChannel,
		getChannels,
		fetchChannelMessages,
		fetchActiveThreads,
		fetchArchivedThreads,
		client,
	};
});

export class DiscordClient extends Context.Tag("DiscordClient")<
	DiscordClient,
	Effect.Effect.Success<typeof createDiscordClientService>
>() {}

export class Discord extends Context.Tag("Discord")<
	Discord,
	Effect.Effect.Success<typeof createDiscordService>
>() {}

export const DiscordClientLayer = Layer.effect(
	DiscordClient,
	createDiscordClientService,
);

export const DiscordLayer = Layer.effect(Discord, createDiscordService).pipe(
	Layer.provide(DiscordClientLayer),
);
