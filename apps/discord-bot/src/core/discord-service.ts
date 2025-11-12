import { ChannelType, type Client, type ClientEvents } from "discord.js";
import {
	Array as Arr,
	Config,
	Context,
	Data,
	Effect,
	Fiber,
	HashMap,
	Layer,
	Option,
	Ref,
	Runtime,
} from "effect";
import { DiscordClient, DiscordClientLayer } from "./discord-client-service";

export class DiscordError extends Data.TaggedError("DiscordError")<{
	cause: unknown;
}> {}

// High-level Discord service - provides convenient operations + re-exports low-level API
export const createDiscordService = Effect.gen(function* () {
	const client = yield* DiscordClient;
	const token = yield* Config.string("DISCORD_BOT_TOKEN");

	// Track active handler fibers for each event type
	// This allows us to wait for all handlers to complete in tests
	const activeHandlers = yield* Ref.make(
		HashMap.empty<string, ReadonlyArray<Fiber.RuntimeFiber<void, unknown>>>(),
	);

	// Helper to wrap client operations in Effect
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
			const eventKey = String(event);

			const listener = (...args: ClientEvents[E]) => {
				// Run the handler Effect in a scoped context to handle resource cleanup
				// Effect.scoped provides a Scope and removes it from the requirements
				const handlerEffect = Effect.scoped(handler(...args));

				// Fork the handler and track the fiber
				const fiber = Runtime.runFork(runtime)(handlerEffect);

				// Add fiber to tracking synchronously
				Runtime.runSync(runtime)(
					Ref.update(activeHandlers, (map) => {
						const existingFibers = Option.getOrElse(
							HashMap.get(map, eventKey),
							(): ReadonlyArray<Fiber.RuntimeFiber<void, unknown>> => [],
						);
						return HashMap.set(map, eventKey, [...existingFibers, fiber]);
					}),
				);

				// Remove fiber from tracking when handler completes
				Runtime.runFork(runtime)(
					Fiber.await(fiber).pipe(
						Effect.flatMap(() =>
							Ref.update(activeHandlers, (map) => {
								const existingFibers = Option.getOrElse(
									HashMap.get(map, eventKey),
									(): ReadonlyArray<Fiber.RuntimeFiber<void, unknown>> => [],
								);
								const updatedFibers = existingFibers.filter(
									(f) => f.id() !== fiber.id(),
								);
								if (updatedFibers.length === 0) {
									return HashMap.remove(map, eventKey);
								}
								return HashMap.set(map, eventKey, updatedFibers);
							}),
						),
						Effect.asVoid,
					),
				);
			};

			client.on(event, listener);

			// Return cleanup function
			return () => {
				client.off(event, listener);
			};
		});

	/**
	 * Wait for all handlers of a specific event to complete.
	 * Useful for testing when you need to ensure all event handlers have finished.
	 */
	const waitForHandlers = <E extends keyof ClientEvents>(
		event: E,
	): Effect.Effect<void, never, never> =>
		Effect.gen(function* () {
			const eventKey = String(event);
			const handlers = yield* Ref.get(activeHandlers);
			const fibers = Option.getOrElse(
				HashMap.get(handlers, eventKey),
				(): ReadonlyArray<Fiber.RuntimeFiber<void, unknown>> => [],
			);

			if (fibers.length === 0) {
				return;
			}

			// Wait for all fibers to complete
			yield* Fiber.awaitAll(fibers).pipe(Effect.asVoid);
		});

	// High-level operations using the raw client
	const getGuild = (id: string) =>
		use((c) => {
			const guild = c.guilds.cache.get(id);
			return guild ?? null;
		});

	const getGuilds = () => use((c) => Arr.fromIterable(c.guilds.cache.values()));

	const getChannel = (id: string) =>
		use((c) => {
			const channel = c.channels.cache.get(id);
			return channel ?? null;
		});

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
				throw new Error(`Channel ${channelId} is not a text channel or thread`);
			}

			return await channel.messages.fetch({
				limit: options.limit,
				after: options.after,
			});
		});

	const fetchActiveThreads = (forumChannelId: string) =>
		use(async (c) => {
			const channel = c.channels.cache.get(forumChannelId);
			if (!channel) {
				throw new Error(`Channel ${forumChannelId} not found`);
			}

			if (channel.type !== ChannelType.GuildForum) {
				throw new Error(`Channel ${forumChannelId} is not a forum channel`);
			}

			return await channel.threads.fetchActive();
		});

	const fetchArchivedThreads = (
		forumChannelId: string,
		options: { before?: string },
	) =>
		use(async (c) => {
			const channel = c.channels.cache.get(forumChannelId);
			if (!channel) {
				throw new Error(`Channel ${forumChannelId} not found`);
			}

			if (channel.type !== ChannelType.GuildForum) {
				throw new Error(`Channel ${forumChannelId} is not a forum channel`);
			}

			return await channel.threads.fetchArchived({
				type: "public",
				before: options.before,
			});
		});

	return {
		getGuild,
		getGuilds,
		getChannel,
		getChannels,
		fetchChannelMessages,
		fetchActiveThreads,
		fetchArchivedThreads,
		client: {
			login,
			on,
			waitForHandlers,
		},
	};
});

export class Discord extends Context.Tag("Discord")<
	Discord,
	Effect.Effect.Success<typeof createDiscordService>
>() {}

export const DiscordLayer = Layer.effect(Discord, createDiscordService).pipe(
	Layer.provide(DiscordClientLayer),
);
