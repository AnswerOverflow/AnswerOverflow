import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";

import { Array as Arr, BigInt as BigIntEffect, Order, Predicate } from "effect";
import {
	type MutationCtx,
	privateMutation,
	privateQuery,
	type QueryCtx,
} from "../client";
import { channelSchema, channelSettingsSchema, type Message } from "../schema";
import { CHANNEL_TYPE, isThreadType } from "../shared/channels";
import { enrichMessages } from "../shared/dataAccess";
import { findMessagesByChannelId } from "../shared/messages";
import {
	DEFAULT_CHANNEL_SETTINGS,
	deleteChannelInternalLogic,
	getChannelWithSettings,
	getFirstMessagesInChannels,
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
		const existingSettings = await getOneFrom(
			ctx.db,
			"channelSettings",
			"by_channelId",
			args.channelId,
		);

		if (existingSettings) {
			await ctx.db.patch(existingSettings._id, {
				...existingSettings,
				...args.settings,
				channelId: args.channelId,
			});
		} else {
			await ctx.db.insert("channelSettings", {
				...DEFAULT_CHANNEL_SETTINGS,
				...args.settings,
				channelId: args.channelId,
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

		const [channel, allChannels, threads] = await Promise.all([
			getChannelWithSettings(ctx, args.channelDiscordId),
			getManyFrom(ctx.db, "channels", "by_serverId", server.discordId),
			getManyFrom(ctx.db, "channels", "by_parentId", args.channelDiscordId),
		]);

		if (!channel || channel.serverId !== server.discordId) return null;

		const rootChannels = allChannels.filter((c) => !isThreadType(c.type));

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
				if (a.type === CHANNEL_TYPE.GuildForum) return -1;
				if (b.type === CHANNEL_TYPE.GuildForum) return 1;
				if (a.type === CHANNEL_TYPE.GuildAnnouncement) return -1;
				if (b.type === CHANNEL_TYPE.GuildAnnouncement) return 1;
				return 0;
			})
			.map((c) => {
				const { flags: _flags, ...channel } = c;
				return channel;
			});

		const isForumChannel = channel.type === CHANNEL_TYPE.GuildForum;

		if (isForumChannel) {
			const sortedThreads = threads
				.sort((a, b) => {
					return BigInt(b.id) > BigInt(a.id)
						? 1
						: BigInt(b.id) < BigInt(a.id)
							? -1
							: 0;
				})
				.slice(0, 50);

			const threadIds = sortedThreads.map((t) => t.id);
			const firstMessages = await getFirstMessagesInChannels(ctx, threadIds);

			const messages = Arr.filter(
				Arr.map(
					sortedThreads,
					(thread) => firstMessages[thread.id.toString()] ?? null,
				),
				Predicate.isNotNull,
			);

			const enrichedMessages = await enrichMessages(ctx, messages);

			const enrichedMessagesMap = new Map(
				enrichedMessages.map((em) => [em.message.id, em]),
			);

			const threadsWithMessages = Arr.filter(
				Arr.map(sortedThreads, (thread) => {
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
				messages: [],
			};
		}

		const channelMessages = await findMessagesByChannelId(
			ctx,
			args.channelDiscordId,
			{ limit: 50 },
		);

		const sortedMessages = Arr.take(
			Arr.sort(
				channelMessages,
				Order.reverse(Order.mapInput(BigIntEffect.Order, (m: Message) => m.id)),
			),
			50,
		);

		const enrichedChannelMessages = await enrichMessages(ctx, sortedMessages);

		return {
			server: {
				...server,
				channels: indexedChannels,
			},
			channels: indexedChannels,
			selectedChannel: channel,
			threads: [],
			messages: enrichedChannelMessages,
		};
	},
});
