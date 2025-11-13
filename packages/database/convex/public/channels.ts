import { type Infer, v } from "convex/values";
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
		// Get server by Discord ID
		const server = await ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.serverDiscordId))
			.first();

		if (!server) return null;

		// Parallelize independent operations: get channel and all channels simultaneously
		const [channel, allChannels, threads] = await Promise.all([
			getChannelWithSettings(ctx, args.channelDiscordId),
			ctx.db
				.query("channels")
				.withIndex("by_serverId", (q) => q.eq("serverId", server._id))
				.collect(),
			ctx.db
				.query("channels")
				.withIndex("by_parentId", (q) =>
					q.eq("parentId", args.channelDiscordId),
				)
				.collect(),
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
		const allSettings = await Promise.all(
			channelIds.map((id) =>
				ctx.db
					.query("channelSettings")
					.withIndex("by_channelId", (q) => q.eq("channelId", id))
					.first(),
			),
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
		const firstMessages = await getFirstMessagesInChannels(ctx, threadIds);

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
	},
});
