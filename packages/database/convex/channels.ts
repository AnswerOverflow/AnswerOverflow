import { type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { channelSchema, channelSettingsSchema } from "./schema";

type Channel = Infer<typeof channelSchema>;
type ChannelSettings = Infer<typeof channelSettingsSchema>;

// Channel types from Discord API
const ChannelType = {
	GuildText: 0,
	GuildAnnouncement: 5,
	GuildForum: 15,
	PublicThread: 11,
	PrivateThread: 12,
	AnnouncementThread: 10,
} as const;

const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

// Helper function to get channel with settings
async function getChannelWithSettings(
	ctx: QueryCtx | MutationCtx,
	channelId: string,
): Promise<(Channel & { flags: ChannelSettings }) | null> {
	const channel = await ctx.db
		.query("channels")
		.filter((q) => q.eq(q.field("id"), channelId))
		.first();

	if (!channel) {
		return null;
	}

	const settings = await ctx.db
		.query("channelSettings")
		.withIndex("by_channelId", (q) => q.eq("channelId", channelId))
		.first();

	return {
		...channel,
		flags: settings ?? { ...DEFAULT_CHANNEL_SETTINGS, channelId },
	};
}

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

export const findChannelByInviteCode = query({
	args: {
		inviteCode: v.string(),
	},
	handler: async (ctx, args) => {
		const channel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("inviteCode"), args.inviteCode))
			.first();

		if (!channel) {
			return null;
		}

		return await getChannelWithSettings(ctx, channel.id);
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
			.filter((q) => q.eq(q.field("parentId"), args.parentId));

		const channels = args.limit
			? await query.take(args.limit)
			: await query.collect();

		return await addSettingsToChannels(ctx, channels);
	},
});

export const findAllChannelsByServerId = query({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const channels = await ctx.db
			.query("channels")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.collect();

		return await addSettingsToChannels(ctx, channels);
	},
});

export const findManyChannelsById = query({
	args: {
		ids: v.array(v.string()),
		includeMessageCount: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const channels: Channel[] = [];
		for (const id of args.ids) {
			const channel = await ctx.db
				.query("channels")
				.filter((q) => q.eq(q.field("id"), id))
				.first();
			if (channel) {
				channels.push(channel);
			}
		}

		const channelsWithFlags = await addSettingsToChannels(ctx, channels);

		if (args.includeMessageCount) {
			// Note: Message count functionality would require a messages table
			// For now, we'll return undefined for messageCount
			// Thread types: 11 (PublicThread), 12 (PrivateThread), 10 (AnnouncementThread)
			const isThreadType = (type: number) =>
				type === ChannelType.PublicThread ||
				type === ChannelType.PrivateThread ||
				type === ChannelType.AnnouncementThread;

			return channelsWithFlags.map((c) => ({
				...c,
				messageCount: isThreadType(c.type) ? undefined : undefined, // TODO: Implement when messages table exists
			}));
		}

		return channelsWithFlags;
	},
});

export const findLatestThreads = query({
	args: {
		take: v.number(),
	},
	handler: async (ctx, args) => {
		const channels = await ctx.db
			.query("channels")
			.withIndex("by_type", (q) => q.eq("type", ChannelType.PublicThread))
			.order("desc")
			.take(args.take);

		return await addSettingsToChannels(ctx, channels);
	},
});

export const findChannelsBeforeId = query({
	args: {
		serverId: v.id("servers"),
		id: v.string(),
		take: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Get all channels for the server and filter manually
		// Convex doesn't support lt() on string IDs directly, so we'll collect and filter
		const allChannels = await ctx.db
			.query("channels")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.collect();

		// Filter channels where id < args.id (comparing as strings)
		const filtered = allChannels
			.filter((c) => c.id < args.id)
			.sort((a, b) => (b.id > a.id ? 1 : -1))
			.slice(0, args.take ?? 100);

		return await addSettingsToChannels(ctx, filtered);
	},
});

// Mutation functions
export const createChannel = mutation({
	args: {
		channel: channelSchema,
		settings: v.optional(channelSettingsSchema),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("channels", args.channel);

		if (args.settings) {
			await ctx.db.insert("channelSettings", args.settings);
		}

		return args.channel.id;
	},
});

export const createManyChannels = mutation({
	args: {
		channels: v.array(
			v.object({
				channel: channelSchema,
				settings: v.optional(channelSettingsSchema),
			}),
		),
	},
	handler: async (ctx, args) => {
		const ids: string[] = [];
		for (const item of args.channels) {
			await ctx.db.insert("channels", item.channel);
			if (item.settings) {
				await ctx.db.insert("channelSettings", item.settings);
			}
			ids.push(item.channel.id);
		}
		return ids;
	},
});

export const updateChannel = mutation({
	args: {
		id: v.string(),
		channel: channelSchema,
		settings: v.optional(channelSettingsSchema),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (!existing) {
			throw new Error(`Channel with id ${args.id} not found`);
		}

		await ctx.db.patch(existing._id, args.channel);

		if (args.settings) {
			const existingSettings = await ctx.db
				.query("channelSettings")
				.withIndex("by_channelId", (q) => q.eq("channelId", args.id))
				.first();

			if (existingSettings) {
				await ctx.db.patch(existingSettings._id, args.settings);
			} else {
				await ctx.db.insert("channelSettings", args.settings);
			}
		}

		return args.id;
	},
});

export const updateManyChannels = mutation({
	args: {
		channels: v.array(channelSchema),
	},
	handler: async (ctx, args) => {
		const ids: string[] = [];
		for (const channel of args.channels) {
			const existing = await ctx.db
				.query("channels")
				.filter((q) => q.eq(q.field("id"), channel.id))
				.first();

			if (existing) {
				await ctx.db.patch(existing._id, channel);
			} else {
				await ctx.db.insert("channels", channel);
			}
			ids.push(channel.id);
		}
		return ids;
	},
});

export const deleteChannel = mutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		// Delete all threads first
		const threads = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("parentId"), args.id))
			.collect();

		for (const thread of threads) {
			// Recursively delete threads using internal mutation
			await ctx.runMutation(internal.channels.deleteChannelInternal, {
				id: thread.id,
			});
		}

		// Delete channel settings
		const settings = await ctx.db
			.query("channelSettings")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.id))
			.collect();

		for (const setting of settings) {
			await ctx.db.delete(setting._id);
		}

		// Delete the channel itself
		const channel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (channel) {
			await ctx.db.delete(channel._id);
		}

		// TODO: Delete messages when messages table exists
		// await deleteManyMessagesByChannelId(args.id);

		return null;
	},
});

export const deleteChannelInternal = internalMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		// Delete all threads first
		const threads = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("parentId"), args.id))
			.collect();

		for (const thread of threads) {
			// Recursively delete threads
			await ctx.runMutation(internal.channels.deleteChannelInternal, {
				id: thread.id,
			});
		}

		// Delete channel settings
		const settings = await ctx.db
			.query("channelSettings")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.id))
			.collect();

		for (const setting of settings) {
			await ctx.db.delete(setting._id);
		}

		// Delete the channel itself
		const channel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();

		if (channel) {
			await ctx.db.delete(channel._id);
		}

		// TODO: Delete messages when messages table exists
		// await deleteManyMessagesByChannelId(args.id);

		return null;
	},
});

export const upsertManyChannels = mutation({
	args: {
		channels: v.array(
			v.object({
				create: channelSchema,
				update: v.optional(channelSchema),
				settings: v.optional(channelSettingsSchema),
			}),
		),
	},
	handler: async (ctx, args) => {
		const ids: string[] = [];

		// First, fetch existing channels
		const existingChannels = await Promise.all(
			args.channels.map((item) =>
				ctx.db
					.query("channels")
					.filter((q) => q.eq(q.field("id"), item.create.id))
					.first(),
			),
		);

		for (let i = 0; i < args.channels.length; i++) {
			const item = args.channels[i];
			if (!item) continue;

			const existing = existingChannels[i];

			if (existing) {
				// Update existing channel
				const updateData = item.update ?? item.create;
				await ctx.db.patch(existing._id, updateData);

				// Update settings if provided
				if (item.settings) {
					const existingSettings = await ctx.db
						.query("channelSettings")
						.withIndex("by_channelId", (q) => q.eq("channelId", item.create.id))
						.first();

					if (existingSettings) {
						await ctx.db.patch(existingSettings._id, item.settings);
					} else {
						await ctx.db.insert("channelSettings", item.settings);
					}
				}
			} else {
				// Create new channel
				await ctx.db.insert("channels", item.create);
				if (item.settings) {
					await ctx.db.insert("channelSettings", item.settings);
				}
			}

			ids.push(item.create.id);
		}

		return ids;
	},
});

// Mutation for inserting/updating channel with settings
export const upsertChannelWithSettings = mutation({
	args: {
		channel: channelSchema,
		settings: v.optional(channelSettingsSchema),
	},
	handler: async (ctx, args) => {
		// Upsert channel
		const existingChannel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.channel.id))
			.first();

		if (existingChannel) {
			await ctx.db.patch(existingChannel._id, args.channel);
		} else {
			await ctx.db.insert("channels", args.channel);
		}

		// Upsert settings if provided
		if (args.settings) {
			const existingSettings = await ctx.db
				.query("channelSettings")
				.withIndex("by_channelId", (q) => q.eq("channelId", args.channel.id))
				.first();

			if (existingSettings) {
				await ctx.db.patch(existingSettings._id, args.settings);
			} else {
				await ctx.db.insert("channelSettings", args.settings);
			}
		}

		return args.channel.id;
	},
});
