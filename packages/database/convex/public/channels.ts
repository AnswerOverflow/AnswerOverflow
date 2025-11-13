import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { type Infer, v } from "convex/values";
import { Effect } from "effect";
import { type MutationCtx, type QueryCtx, query } from "../_generated/server";
import type { channelSchema, channelSettingsSchema } from "../schema";
import {
	getChannelWithSettings,
	getFirstMessagesInChannels,
} from "../shared/shared";

type Channel = Infer<typeof channelSchema>;
type ChannelSettings = Infer<typeof channelSettingsSchema>;

const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

// Helper function to add settings to multiple channels
async function addSettingsToChannels(
	ctx: QueryCtx | MutationCtx,
	channels: Channel[],
): Promise<Array<Channel & { flags: ChannelSettings }>> {
	if (channels.length === 0) return [];

	const channelIds = channels.map((c) => c.id);
	const allSettings = await Promise.all(
		channelIds.map((id) =>
			ctx.db
				.query("channelSettings")
				.withIndex("by_channelId", (q) => q.eq("channelId", id))
				.first(),
		),
	);

	return channels.map((channel, idx) => ({
		...channel,
		flags: allSettings[idx] ?? {
			...DEFAULT_CHANNEL_SETTINGS,
			channelId: channel.id,
		},
	}));
}

export const getChannelByDiscordId = query({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await getChannelWithSettings(ctx, args.discordId);
	},
});

export const findManyChannelsById = query({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const channels = await Promise.all(
			args.ids.map((id) =>
				ctx.db
					.query("channels")
					.withIndex("by_discordChannelId", (q) => q.eq("id", id))
					.first(),
			),
		);

		const validChannels = channels.filter(
			(channel): channel is NonNullable<(typeof channels)[0]> =>
				channel !== null,
		);

		const channelsWithFlags = await addSettingsToChannels(
			ctx,
			validChannels.map((c) => ({
				id: c.id,
				serverId: c.serverId,
				name: c.name,
				type: c.type,
				parentId: c.parentId,
				inviteCode: c.inviteCode,
				archivedTimestamp: c.archivedTimestamp,
				solutionTagId: c.solutionTagId,
				lastIndexedSnowflake: c.lastIndexedSnowflake,
			})),
		);

		return channelsWithFlags;
	},
});

export const findAllThreadsByParentId = query({
	args: {
		parentId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const query = ctx.db
			.query("channels")
			.withIndex("by_parentId", (q) => q.eq("parentId", args.parentId));

		const channels = args.limit
			? await query.take(args.limit)
			: await query.collect();

		return await addSettingsToChannels(ctx, channels);
	},
});

export const getChannelPageData = query({
	args: {
		serverDiscordId: v.string(),
		channelDiscordId: v.string(),
	},
	handler: async (ctx, args) => {
		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan("channels.getChannelPageData")(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"discord.server.id": args.serverDiscordId,
						"discord.channel.id": args.channelDiscordId,
						"convex.function": "getChannelPageData",
					});

					// Get server by Discord ID
					const server = yield* Effect.withSpan(
						"channels.getChannelPageData.getServer",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"discord.server.id": args.serverDiscordId,
							});
							return yield* Effect.tryPromise({
								try: () =>
									ctx.db
										.query("servers")
										.withIndex("by_discordId", (q) =>
											q.eq("discordId", args.serverDiscordId),
										)
										.first(),
								catch: (error) => new Error(String(error)),
							});
						}),
					);

					if (!server) return null;

					// Parallelize independent operations: get channel and all channels simultaneously
					const [channel, allChannels, threads] = yield* Effect.all([
						Effect.withSpan("channels.getChannelPageData.getChannel")(
							Effect.gen(function* () {
								yield* Effect.annotateCurrentSpan({
									"discord.channel.id": args.channelDiscordId,
								});
								return yield* Effect.tryPromise({
									try: () => getChannelWithSettings(ctx, args.channelDiscordId),
									catch: (error) => new Error(String(error)),
								});
							}),
						),
						Effect.withSpan("channels.getChannelPageData.getAllChannels")(
							Effect.gen(function* () {
								yield* Effect.annotateCurrentSpan({
									"convex.server.id": server._id,
								});
								return yield* Effect.tryPromise({
									try: () =>
										ctx.db
											.query("channels")
											.withIndex("by_serverId", (q) =>
												q.eq("serverId", server._id),
											)
											.collect(),
									catch: (error) => new Error(String(error)),
								});
							}),
						),
						Effect.withSpan("channels.getChannelPageData.getThreads")(
							Effect.gen(function* () {
								yield* Effect.annotateCurrentSpan({
									"discord.channel.id": args.channelDiscordId,
								});
								return yield* Effect.tryPromise({
									try: () =>
										ctx.db
											.query("channels")
											.withIndex("by_parentId", (q) =>
												q.eq("parentId", args.channelDiscordId),
											)
											.collect(),
									catch: (error) => new Error(String(error)),
								});
							}),
						),
					]);

					if (!channel || channel.serverId !== server._id) return null;

					// Filter to root channels with indexing enabled
					const ROOT_CHANNEL_TYPES = [10, 11, 12, 13, 15] as const; // Forum, Announcement, Text, etc.
					const rootChannels = allChannels.filter((c) =>
						ROOT_CHANNEL_TYPES.includes(
							c.type as (typeof ROOT_CHANNEL_TYPES)[number],
						),
					);

					const channelIds = rootChannels.map((c) => c.id);
					const allSettings = yield* Effect.withSpan(
						"channels.getChannelPageData.getChannelSettings",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"channels.count": channelIds.length,
							});
							return yield* Effect.all(
								channelIds.map((id) =>
									Effect.tryPromise({
										try: () =>
											ctx.db
												.query("channelSettings")
												.withIndex("by_channelId", (q) => q.eq("channelId", id))
												.first(),
										catch: (error) => new Error(String(error)),
									}),
								),
							);
						}),
					);

					const indexedChannels = rootChannels
						.map((c, idx) => ({
							...c,
							flags: allSettings[idx] ?? {
								...DEFAULT_CHANNEL_SETTINGS,
								channelId: c.id,
							},
						}))
						.filter((c) => c.flags.indexingEnabled)
						.sort((a, b) => {
							// Sort: forums first, then announcements, then text
							if (a.type === 15) return -1; // GuildForum
							if (b.type === 15) return 1;
							if (a.type === 5) return -1; // GuildAnnouncement
							if (b.type === 5) return 1;
							return 0;
						})
						.map((c) => {
							// Return full channel object without flags
							const { flags: _flags, ...channel } = c;
							return channel;
						});

					// Sort threads by ID (newest first) and limit to 50
					const sortedThreads = threads
						.sort((a, b) => {
							return b.id > a.id ? 1 : b.id < a.id ? -1 : 0;
						})
						.slice(0, 50);

					// Get first message for each thread in one batch query
					const threadIds = sortedThreads.map((t) => t.id);
					const firstMessages = yield* Effect.withSpan(
						"channels.getChannelPageData.getFirstMessages",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"threads.count": threadIds.length,
							});
							return yield* Effect.tryPromise({
								try: () => getFirstMessagesInChannels(ctx, threadIds),
								catch: (error) => new Error(String(error)),
							});
						}),
					);

					// Combine threads with their first messages
					const threadsWithMessages = sortedThreads
						.map((thread) => ({
							thread,
							message: firstMessages[thread.id] ?? null,
						}))
						.filter(
							(
								tm,
							): tm is {
								thread: typeof tm.thread;
								message: NonNullable<typeof tm.message>;
							} => tm.message !== null,
						);

					return {
						server: {
							...server,
							channels: indexedChannels,
						},
						channels: indexedChannels,
						selectedChannel: channel,
						threads: threadsWithMessages,
					};
				}),
			);
		});
		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});
