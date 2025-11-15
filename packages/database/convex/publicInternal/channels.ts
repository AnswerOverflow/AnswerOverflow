import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import {
	internalMutation,
	type MutationCtx,
	publicInternalMutation,
	publicInternalQuery,
	type QueryCtx,
} from "../client";
import { channelSchema, channelSettingsSchema } from "../schema";
import {
	CHANNEL_TYPE,
	deleteChannelInternalLogic,
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

export const findChannelByInviteCode = publicInternalQuery({
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

export const findChannelByDiscordId = publicInternalQuery({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await getChannelWithSettings(ctx, args.discordId);
	},
});

export const findAllThreadsByParentId = publicInternalQuery({
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

export const findAllChannelsByServerId = publicInternalQuery({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const channels = await getManyFrom(
			ctx.db,
			"channels",
			"by_serverId",
			args.serverId,
		);

		return await addSettingsToChannels(ctx, channels);
	},
});

export const findLatestThreads = publicInternalQuery({
	args: {
		take: v.number(),
	},
	handler: async (ctx, args) => {
		const channels = await ctx.db
			.query("channels")
			.withIndex("by_type", (q) => q.eq("type", CHANNEL_TYPE.PublicThread))
			.order("desc")
			.take(args.take);

		return await addSettingsToChannels(ctx, channels);
	},
});

export const findChannelsBeforeId = publicInternalQuery({
	args: {
		serverId: v.id("servers"),
		id: v.string(),
		take: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Get all channels for the server and filter manually
		// Convex doesn't support lt() on string IDs directly, so we'll collect and filter
		const allChannels = await getManyFrom(
			ctx.db,
			"channels",
			"by_serverId",
			args.serverId,
		);

		// Filter channels where id < args.id (comparing as strings)
		const filtered = allChannels
			.filter((c) => c.id < args.id)
			.sort((a, b) => (b.id > a.id ? 1 : -1))
			.slice(0, args.take ?? 100);

		return await addSettingsToChannels(ctx, filtered);
	},
});

// Mutation functions
export const createChannel = publicInternalMutation({
	args: {
		channel: channelSchema,
		settings: v.optional(channelSettingsSchema),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("channels", args.channel);

		if (args.settings) {
			// Check for existing settings to prevent duplicates
			const existingSettings = await getOneFrom(
				ctx.db,
				"channelSettings",
				"by_channelId",
				args.channel.id,
			);

			if (!existingSettings) {
				await ctx.db.insert("channelSettings", args.settings);
			} else {
				// Update existing settings if they already exist
				await ctx.db.patch(existingSettings._id, args.settings);
			}
		}

		return args.channel.id;
	},
});

export const createManyChannels = publicInternalMutation({
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
				// Check for existing settings to prevent duplicates
				const existingSettings = await getOneFrom(
					ctx.db,
					"channelSettings",
					"by_channelId",
					item.channel.id,
				);

				if (!existingSettings) {
					await ctx.db.insert("channelSettings", item.settings);
				} else {
					// Update existing settings if they already exist
					await ctx.db.patch(existingSettings._id, item.settings);
				}
			}
			ids.push(item.channel.id);
		}
		return ids;
	},
});

export const updateChannel = publicInternalMutation({
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

		// Use replace instead of patch to allow removing optional fields
		// Replace the entire document with the new channel data
		await ctx.db.replace(existing._id, {
			...args.channel,
			_id: existing._id,
			_creationTime: existing._creationTime,
		});

		if (args.settings) {
			const existingSettings = await getOneFrom(
				ctx.db,
				"channelSettings",
				"by_channelId",
				args.id,
			);

			if (existingSettings) {
				await ctx.db.patch(existingSettings._id, args.settings);
			} else {
				await ctx.db.insert("channelSettings", args.settings);
			}
		}

		return args.id;
	},
});

export const updateManyChannels = publicInternalMutation({
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

export const deleteChannel = publicInternalMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteChannelInternalLogic(ctx, args.id);
		return null;
	},
});

export const deleteChannelInternal = internalMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteChannelInternalLogic(ctx, args.id);
		return null;
	},
});

export const upsertManyChannels = publicInternalMutation({
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
					const existingSettings = await getOneFrom(
						ctx.db,
						"channelSettings",
						"by_channelId",
						item.create.id,
					);

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
					// Check for existing settings to prevent duplicates
					const existingSettings = await getOneFrom(
						ctx.db,
						"channelSettings",
						"by_channelId",
						item.create.id,
					);

					if (!existingSettings) {
						await ctx.db.insert("channelSettings", item.settings);
					} else {
						// Update existing settings if they already exist
						await ctx.db.patch(existingSettings._id, item.settings);
					}
				}
			}

			ids.push(item.create.id);
		}

		return ids;
	},
});

// Mutation for inserting/updating channel with settings
export const upsertChannelWithSettings = publicInternalMutation({
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
			const existingSettings = await getOneFrom(
				ctx.db,
				"channelSettings",
				"by_channelId",
				args.channel.id,
			);

			if (existingSettings) {
				await ctx.db.patch(existingSettings._id, args.settings);
			} else {
				await ctx.db.insert("channelSettings", args.settings);
			}
		}

		return args.channel.id;
	},
});

export const findManyChannelsById = publicInternalQuery({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const channels = await asyncMap(args.ids, (id) =>
			getOneFrom(ctx.db, "channels", "by_discordChannelId", id, "id"),
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

export const getChannelPageData = publicInternalQuery({
	args: {
		serverDiscordId: v.string(),
		channelDiscordId: v.string(),
	},
	handler: async (ctx, args) => {
		// Get server by Discord ID
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverDiscordId,
		);

		if (!server) return null;

		// Get channel and all channels simultaneously
		const [channel, allChannels, threads] = await Promise.all([
			getChannelWithSettings(ctx, args.channelDiscordId),
			getManyFrom(ctx.db, "channels", "by_serverId", server._id),
			getManyFrom(ctx.db, "channels", "by_parentId", args.channelDiscordId),
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
		const allSettings = await asyncMap(channelIds, (id) =>
			getOneFrom(ctx.db, "channelSettings", "by_channelId", id),
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

		// Get first message for each thread
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
