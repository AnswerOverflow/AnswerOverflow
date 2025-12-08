import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";

import { Array as Arr, Predicate } from "effect";
import {
	type MutationCtx,
	privateMutation,
	privateQuery,
	type QueryCtx,
} from "../client";
import { channelSchema, channelSettingsSchema } from "../schema";
import { enrichMessages } from "../shared/dataAccess";
import {
	CHANNEL_TYPE,
	DEFAULT_CHANNEL_SETTINGS,
	deleteChannelInternalLogic,
	getChannelWithSettings,
	getFirstMessagesInChannels,
	getThreadStartMessage,
} from "../shared/shared";

type Channel = Infer<typeof channelSchema>;
type ChannelSettings = Infer<typeof channelSettingsSchema>;

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

export const findChannelByDiscordId = privateQuery({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args) => {
		return await getChannelWithSettings(ctx, args.discordId);
	},
});

export const findAllChannelsByServerId = privateQuery({
	args: {
		serverId: v.int64(),
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

export const findManyChannelsByDiscordIds = privateQuery({
	args: {
		discordIds: v.array(v.int64()),
	},
	handler: async (ctx, args) => {
		const channels = await asyncMap(args.discordIds, (id) =>
			getOneFrom(ctx.db, "channels", "by_discordChannelId", id, "id"),
		);

		return Arr.filter(channels, Predicate.isNotNull);
	},
});

export const upsertChannel = privateMutation({
	args: {
		channel: channelSchema,
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"channels",
			"by_discordChannelId",
			args.channel.id,
			"id",
		);

		if (existing) {
			return await ctx.db.patch(existing._id, args.channel);
		} else {
			return await ctx.db.insert("channels", args.channel);
		}
	},
});

export const deleteChannel = privateMutation({
	args: {
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		await deleteChannelInternalLogic(ctx, args.id);
		return null;
	},
});

export const updateChannelSettings = privateMutation({
	args: {
		channelId: v.int64(),
		settings: channelSettingsSchema.partial(),
	},
	handler: async (ctx, args) => {
		const [existingSettings, channel] = await Promise.all([
			getOneFrom(ctx.db, "channelSettings", "by_channelId", args.channelId),
			getOneFrom(
				ctx.db,
				"channels",
				"by_discordChannelId",
				args.channelId,
				"id",
			),
		]);

		if (!channel) {
			throw new Error(`Channel ${args.channelId} not found`);
		}

		if (existingSettings) {
			await ctx.db.patch(existingSettings._id, {
				...existingSettings,
				...args.settings,
				channelId: args.channelId,
				serverId: channel.serverId,
			});
		} else {
			await ctx.db.insert("channelSettings", {
				...DEFAULT_CHANNEL_SETTINGS,
				...args.settings,
				channelId: args.channelId,
				serverId: channel.serverId,
			});
		}

		return args.channelId;
	},
});

export const getChannelPageData = privateQuery({
	args: {
		serverDiscordId: v.int64(),
		channelDiscordId: v.int64(),
	},
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverDiscordId,
		);

		if (!server) return null;

		const [channel, indexedSettings, threads] = await Promise.all([
			getChannelWithSettings(ctx, args.channelDiscordId),
			ctx.db
				.query("channelSettings")
				.withIndex("by_serverId_and_indexingEnabled", (q) =>
					q.eq("serverId", server.discordId).eq("indexingEnabled", true),
				)
				.collect(),
			ctx.db
				.query("channels")
				.withIndex("by_parentId_and_id", (q) =>
					q.eq("parentId", args.channelDiscordId),
				)
				.order("desc")
				.take(50),
		]);

		if (!channel || channel.serverId !== server.discordId) return null;

		const indexedChannelIds = indexedSettings.map((s) => s.channelId);

		const allIndexedChannels = await asyncMap(indexedChannelIds, (channelId) =>
			getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
		);

		const indexedChannels = Arr.filter(allIndexedChannels, Predicate.isNotNull)
			.filter(
				(c) =>
					c.type === CHANNEL_TYPE.GuildText ||
					c.type === CHANNEL_TYPE.GuildAnnouncement ||
					c.type === CHANNEL_TYPE.GuildForum,
			)
			.sort((a, b) => {
				if (a.type === CHANNEL_TYPE.GuildForum) return -1;
				if (b.type === CHANNEL_TYPE.GuildForum) return 1;
				if (a.type === CHANNEL_TYPE.GuildAnnouncement) return -1;
				if (b.type === CHANNEL_TYPE.GuildAnnouncement) return 1;
				return 0;
			});

		const threadIds = threads.map((t) => t.id);
		const [firstMessages, rootMessages] = await Promise.all([
			getFirstMessagesInChannels(ctx, threadIds),
			Promise.all(threadIds.map((id) => getThreadStartMessage(ctx, id))),
		]);

		const rootMessageIds = new Set(
			Arr.filter(rootMessages, Predicate.isNotNull).map((m) => m.id),
		);

		const threadsWithRootMessage = Arr.filter(threads, (thread) =>
			rootMessageIds.has(thread.id),
		);

		const messages = Arr.filter(
			Arr.map(
				threadsWithRootMessage,
				(thread) => firstMessages[thread.id.toString()] ?? null,
			),
			Predicate.isNotNull,
		);

		const enrichedMessages = await enrichMessages(ctx, messages);

		const enrichedMessagesMap = new Map(
			enrichedMessages.map((em) => [em.message.id, em]),
		);

		const threadsWithMessages = Arr.filter(
			Arr.map(threadsWithRootMessage, (thread) => {
				const message = firstMessages[thread.id.toString()];
				if (!message) return null;
				const enrichedMessage = enrichedMessagesMap.get(message.id);
				if (!enrichedMessage) return null;
				return {
					thread,
					message: enrichedMessage,
				};
			}),
			Predicate.isNotNull,
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

export const getChannelPageHeaderData = privateQuery({
	args: {
		serverDiscordId: v.int64(),
		channelDiscordId: v.int64(),
	},
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverDiscordId,
		);

		if (!server) return null;

		const [channel, indexedSettings] = await Promise.all([
			getChannelWithSettings(ctx, args.channelDiscordId),
			ctx.db
				.query("channelSettings")
				.withIndex("by_serverId_and_indexingEnabled", (q) =>
					q.eq("serverId", server.discordId).eq("indexingEnabled", true),
				)
				.collect(),
		]);

		if (!channel || channel.serverId !== server.discordId) return null;

		const indexedChannelIds = indexedSettings.map((s) => s.channelId);

		const allIndexedChannels = await asyncMap(indexedChannelIds, (channelId) =>
			getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
		);

		const indexedChannels = Arr.filter(allIndexedChannels, Predicate.isNotNull)
			.filter(
				(c) =>
					c.type === CHANNEL_TYPE.GuildText ||
					c.type === CHANNEL_TYPE.GuildAnnouncement ||
					c.type === CHANNEL_TYPE.GuildForum,
			)
			.sort((a, b) => {
				if (a.type === CHANNEL_TYPE.GuildForum) return -1;
				if (b.type === CHANNEL_TYPE.GuildForum) return 1;
				if (a.type === CHANNEL_TYPE.GuildAnnouncement) return -1;
				if (b.type === CHANNEL_TYPE.GuildAnnouncement) return 1;
				return 0;
			});

		return {
			server: {
				...server,
				channels: indexedChannels,
			},
			channels: indexedChannels,
			selectedChannel: channel,
		};
	},
});

export const getChannelPageThreads = privateQuery({
	args: {
		channelDiscordId: v.int64(),
	},
	handler: async (ctx, args) => {
		const threads = await ctx.db
			.query("channels")
			.withIndex("by_parentId_and_id", (q) =>
				q.eq("parentId", args.channelDiscordId),
			)
			.order("desc")
			.take(50);

		const threadIds = threads.map((t) => t.id);
		const [firstMessages, rootMessages] = await Promise.all([
			getFirstMessagesInChannels(ctx, threadIds),
			Promise.all(threadIds.map((id) => getThreadStartMessage(ctx, id))),
		]);

		const rootMessageIds = new Set(
			Arr.filter(rootMessages, Predicate.isNotNull).map((m) => m.id),
		);

		const threadsWithRootMessage = Arr.filter(threads, (thread) =>
			rootMessageIds.has(thread.id),
		);

		const messages = Arr.filter(
			Arr.map(
				threadsWithRootMessage,
				(thread) => firstMessages[thread.id.toString()] ?? null,
			),
			Predicate.isNotNull,
		);

		const enrichedMessages = await enrichMessages(ctx, messages);

		const enrichedMessagesMap = new Map(
			enrichedMessages.map((em) => [em.message.id, em]),
		);

		return Arr.filter(
			Arr.map(threadsWithRootMessage, (thread) => {
				const message = firstMessages[thread.id.toString()];
				if (!message) return null;
				const enrichedMessage = enrichedMessagesMap.get(message.id);
				if (!enrichedMessage) return null;
				return {
					thread,
					message: enrichedMessage,
				};
			}),
			Predicate.isNotNull,
		);
	},
});
