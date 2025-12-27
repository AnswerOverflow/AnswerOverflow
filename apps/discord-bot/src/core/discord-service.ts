import {
	captureEffectCause,
	captureException,
	captureMessage,
	setTag,
} from "@packages/observability/sentry";
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
	Metric,
	Option,
	Ref,
	Runtime,
} from "effect";
import { discordApiCalls, discordApiErrors } from "../metrics";
import { DiscordClient, DiscordClientLayer } from "./discord-client-service";

export class DiscordAPIError extends Data.TaggedError("DiscordAPIError")<{
	cause: RawDiscordAPIError;
}> {
	override get message() {
		return this.cause.message;
	}
}

export class UnknownDiscordError extends Data.TaggedError(
	"UnknownDiscordError",
)<{
	cause: unknown;
}> {
	override get message() {
		return this.cause instanceof Error
			? this.cause.message
			: "Unknown Discord error";
	}
}

export const createDiscordService = Effect.gen(function* () {
	const client = yield* DiscordClient;
	const token = process.env.DISCORD_TOKEN!;

	const activeHandlers = yield* Ref.make(
		HashMap.empty<string, ReadonlyArray<Fiber.RuntimeFiber<void, unknown>>>(),
	);

	const use = <A>(
		operationName: string,
		fn: (client: Client) => A | Promise<A>,
	) =>
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
		}).pipe(
			Effect.tap(() => Metric.increment(discordApiCalls)),
			Effect.tapError(() => Metric.increment(discordApiErrors)),
			Effect.withSpan(`discord.${operationName}`),
		);

	const setupErrorListeners = () => {
		client.on("error", (error) => {
			captureException(error, { tags: { discord_event: "error" } });
		});

		client.on("shardError", (error, shardId) => {
			captureException(error, {
				tags: { discord_event: "shardError", shard_id: String(shardId) },
			});
		});

		client.on("warn", (message) => {
			captureMessage(message, "warning");
			setTag("discord_event", "warn");
		});
	};

	const login = () =>
		Effect.gen(function* () {
			setupErrorListeners();

			yield* use("login", (c) => c.login(token));

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
				const handlerEffect = Effect.scoped(handler(...args)).pipe(
					Effect.tapErrorCause((cause) =>
						Effect.sync(() => {
							captureEffectCause(cause, {
								tags: { discord_event: eventKey },
							});
						}),
					),
				);

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
		use("get_guild", (c) => {
			const guild = c.guilds.cache.get(id);
			return guild ?? null;
		});

	const getGuilds = () =>
		use("get_guilds", (c) => Arr.fromIterable(c.guilds.cache.values()));

	const getChannel = (id: string) =>
		use("get_channel", (c) => {
			const channel = c.channels.cache.get(id);
			return channel ?? null;
		});

	const fetchChannelMessages = (
		channelId: string,
		options: { limit: number; after?: string },
	) =>
		use("fetch_channel_messages", async (c) => {
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
		}).pipe(
			Effect.annotateLogs({ channelId }),
			Effect.annotateSpans({ "discord.channel_id": channelId }),
		);

	const fetchActiveThreads = (forumChannelId: string) =>
		use("fetch_active_threads", async (c) => {
			const channel = c.channels.cache.get(forumChannelId);
			if (!channel) {
				throw new Error(`Channel ${forumChannelId} not found`);
			}

			if (channel.type !== ChannelType.GuildForum) {
				throw new Error(`Channel ${forumChannelId} is not a forum channel`);
			}

			return await channel.threads.fetchActive();
		}).pipe(
			Effect.annotateLogs({ channelId: forumChannelId }),
			Effect.annotateSpans({ "discord.channel_id": forumChannelId }),
		);

	const fetchArchivedThreads = (
		forumChannelId: string,
		options: { before?: string },
	) =>
		use("fetch_archived_threads", async (c) => {
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
		}).pipe(
			Effect.annotateLogs({ channelId: forumChannelId }),
			Effect.annotateSpans({ "discord.channel_id": forumChannelId }),
		);

	const callClient = <T>(call: () => T | Promise<T>) =>
		Effect.tryPromise({
			try: async () => {
				return await call();
			},
			catch: (cause) => {
				if (cause instanceof RawDiscordAPIError) {
					return new DiscordAPIError({ cause });
				}
				return new UnknownDiscordError({ cause });
			},
		}).pipe(
			Effect.tap(() => Metric.increment(discordApiCalls)),
			Effect.tapError(() => Metric.increment(discordApiErrors)),
			Effect.withSpan("discord.api_call"),
		);

	const setActivity = (name: string, options?: { type?: ActivityType }) =>
		use("set_activity", (c) => {
			return c.user?.setActivity(name, options);
		});

	const getBotPermissionsForChannel = (channelId: string, guildId: string) =>
		use("get_bot_permissions", async (c) => {
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

	const updateBotMemberProfile = (
		guildId: string,
		options: {
			nick?: string | null;
			avatar?: string | null;
			banner?: string | null;
			bio?: string | null;
		},
	) =>
		use("update_bot_member_profile", async (c) => {
			const body: Record<string, string | null> = {};
			if (options.nick !== undefined) body.nick = options.nick;
			if (options.avatar !== undefined) body.avatar = options.avatar;
			if (options.banner !== undefined) body.banner = options.banner;
			if (options.bio !== undefined) body.bio = options.bio;

			await c.rest.patch(`/guilds/${guildId}/members/@me`, { body });
		}).pipe(
			Effect.annotateLogs({ guildId }),
			Effect.annotateSpans({ "discord.guild_id": guildId }),
		);

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
		updateBotMemberProfile,
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

export const DiscordLayerInternal = Layer.effect(Discord, createDiscordService);

export const DiscordLayer = DiscordLayerInternal.pipe(
	Layer.provide(DiscordClientLayer),
);
