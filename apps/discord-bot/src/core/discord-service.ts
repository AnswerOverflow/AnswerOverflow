import {
	type ActivityType,
	ChannelType,
	type Client,
	type ClientEvents,
	DiscordAPIError as RawDiscordAPIError,
} from "discord.js";
import {
	Array as Arr,
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

class DiscordAPIError extends Data.TaggedError("DiscordAPIError")<{
	cause: RawDiscordAPIError;
}> {}

export class UnknownDiscordError extends Data.TaggedError(
	"UnknownDiscordError",
)<{
	cause: unknown;
}> {}

export const createDiscordService = Effect.gen(function* () {
	const client = yield* DiscordClient;
	const token = process.env.DISCORD_TOKEN!;

	const activeHandlers = yield* Ref.make(
		HashMap.empty<string, ReadonlyArray<Fiber.RuntimeFiber<void, unknown>>>(),
	);

	const use = <A>(fn: (client: Client) => A | Promise<A>) =>
		Effect.tryPromise({
			try: async (): Promise<Awaited<A>> => {
				const result = await fn(client);
				return result;
			},
			catch: (cause) => {
				if (cause instanceof RawDiscordAPIError) {
					return new DiscordAPIError({ cause });
				}
				return new UnknownDiscordError({ cause });
			},
		});

	const login = () =>
		Effect.gen(function* () {
			yield* use((c) => c.login(token));

			yield* Effect.async<void, UnknownDiscordError>((resume) => {
				client.once("clientReady", () => {
					resume(Effect.void);
				});
				client.once("error", (error) => {
					resume(Effect.fail(new UnknownDiscordError({ cause: error })));
				});
			});
		});

	const on = <E extends keyof ClientEvents, Err = never, Req = never>(
		event: E,
		handler: (...args: ClientEvents[E]) => Effect.Effect<void, Err, Req>,
	): Effect.Effect<() => void, UnknownDiscordError, Req> =>
		Effect.gen(function* () {
			const runtime: Runtime.Runtime<Req> = yield* Effect.runtime<Req>();
			const eventKey = String(event);

			const listener = (...args: ClientEvents[E]) => {
				const handlerEffect = Effect.scoped(handler(...args));

				const fiber = Runtime.runFork(runtime)(handlerEffect);

				Runtime.runSync(runtime)(
					Ref.update(activeHandlers, (map) => {
						const existingFibers = Option.getOrElse(
							HashMap.get(map, eventKey),
							(): ReadonlyArray<Fiber.RuntimeFiber<void, unknown>> => [],
						);
						return HashMap.set(map, eventKey, [...existingFibers, fiber]);
					}),
				);

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

			return () => {
				client.off(event, listener);
			};
		});

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

			yield* Fiber.awaitAll(fibers).pipe(Effect.asVoid);
		});

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

	const callClient = <T>(call: () => T | Promise<T>) =>
		Effect.gen(function* () {
			return yield* Effect.tryPromise({
				try: async () => {
					return await call();
				},
				catch: (cause) => {
					if (cause instanceof RawDiscordAPIError) {
						return new DiscordAPIError({ cause });
					}
					return new UnknownDiscordError({ cause });
				},
			});
		});

	const setActivity = (name: string, options?: { type?: ActivityType }) =>
		use((c) => {
			return c.user?.setActivity(name, options);
		});

	const getBotPermissionsForChannel = (channelId: string, guildId: string) =>
		use(async (c) => {
			const guild = c.guilds.cache.get(guildId);
			if (!guild) {
				return null;
			}
			const channel = guild.channels.cache.get(channelId);
			if (!channel) {
				return null;
			}
			if (!c.user) {
				return null;
			}
			const botMember = guild.members.me;
			if (!botMember) {
				return null;
			}
			const permissions = channel.permissionsFor(botMember);
			if (!permissions) {
				return null;
			}
			return permissions.bitfield.toString();
		});

	return {
		getGuild,
		getGuilds,
		getChannel,
		fetchChannelMessages,
		fetchActiveThreads,
		fetchArchivedThreads,
		callClient,
		setActivity,
		use,
		getBotPermissionsForChannel,
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
