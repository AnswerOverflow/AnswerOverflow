import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Effect } from "effect";
import { query } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../client";
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

async function addSettingsToChannels(
	ctx: QueryCtx | MutationCtx,
	channels: Channel[],
): Promise<Array<Channel & { flags: ChannelSettings }>> {
	if (channels.length === 0) return [];

	const channelIds = channels.map((c) => c.id);
	const allSettings = await asyncMap(channelIds, (id) =>
		getOneFrom(ctx.db, "channelSettings", "by_channelId", id),
	);

	return channels.map((channel, idx) => ({
		...channel,
		flags: allSettings[idx] ?? {
			...DEFAULT_CHANNEL_SETTINGS,
			channelId: channel.id,
		},
	}));
}

export const findAllThreadsByParentId = query({
	args: {
		parentId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const allChannels = await getManyFrom(
			ctx.db,
			"channels",
			"by_parentId",
			args.parentId,
		);
		const channels = args.limit
			? allChannels.slice(0, args.limit)
			: allChannels;

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

					const server = yield* Effect.withSpan(
						"channels.getChannelPageData.getServer",
					)(
						Effect.gen(function* () {
							yield* Effect.annotateCurrentSpan({
								"discord.server.id": args.serverDiscordId,
							});
							return yield* Effect.tryPromise({
								try: () =>
									getOneFrom(
										ctx.db,
										"servers",
										"by_discordId",
										args.serverDiscordId,
									),
								catch: (error) => new Error(String(error)),
							});
						}),
					);

					if (!server) return null;

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
										getManyFrom(ctx.db, "channels", "by_serverId", server._id),
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
										getManyFrom(
											ctx.db,
											"channels",
											"by_parentId",
											args.channelDiscordId,
										),
									catch: (error) => new Error(String(error)),
								});
							}),
						),
					]);

					if (!channel || channel.serverId !== server._id) return null;

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
											getOneFrom(ctx.db, "channelSettings", "by_channelId", id),
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
							if (a.type === 15) return -1; // GuildForum
							if (b.type === 15) return 1;
							if (a.type === 5) return -1; // GuildAnnouncement
							if (b.type === 5) return 1;
							return 0;
						})
						.map((c) => {
							const { flags: _flags, ...channel } = c;
							return channel;
						});

					const sortedThreads = threads
						.sort((a, b) => {
							return b.id > a.id ? 1 : b.id < a.id ? -1 : 0;
						})
						.slice(0, 50);

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
