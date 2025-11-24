import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { ChannelType } from "discord-api-types/v10";
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

export const findChannelByInviteCode = privateQuery({
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

export const findChannelByDiscordId = privateQuery({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await getChannelWithSettings(ctx, args.discordId);
	},
});

export const findAllChannelsByServerId = privateQuery({
	args: {
		serverId: v.string(),
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

export const updateChannel = privateMutation({
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

export const updateManyChannels = privateMutation({
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

export const deleteChannel = privateMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteChannelInternalLogic(ctx, args.id);
		return null;
	},
});

export const upsertManyChannels = privateMutation({
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
				const updateData = item.update ?? item.create;
				await ctx.db.patch(existing._id, updateData);

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
				await ctx.db.insert("channels", item.create);
				if (item.settings) {
					const existingSettings = await getOneFrom(
						ctx.db,
						"channelSettings",
						"by_channelId",
						item.create.id,
					);

					if (!existingSettings) {
						await ctx.db.insert("channelSettings", item.settings);
					} else {
						await ctx.db.patch(existingSettings._id, item.settings);
					}
				}
			}

			ids.push(item.create.id);
		}

		return ids;
	},
});

export const upsertChannelWithSettings = privateMutation({
	args: {
		channel: channelSchema,
		settings: v.optional(channelSettingsSchema),
	},
	handler: async (ctx, args) => {
		const existingChannel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.channel.id))
			.first();

		if (existingChannel) {
			await ctx.db.patch(existingChannel._id, args.channel);
		} else {
			await ctx.db.insert("channels", args.channel);
		}

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

export const getChannelPageData = privateQuery({
	args: {
		serverDiscordId: v.string(),
		channelDiscordId: v.string(),
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

		const ROOT_CHANNEL_TYPES = [
			ChannelType.AnnouncementThread,
			ChannelType.PublicThread,
			ChannelType.PrivateThread,
			ChannelType.GuildStageVoice,
			ChannelType.GuildForum,
		] as const;
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
				if (a.type === ChannelType.GuildForum) return -1;
				if (b.type === ChannelType.GuildForum) return 1;
				if (a.type === ChannelType.GuildAnnouncement) return -1;
				if (b.type === ChannelType.GuildAnnouncement) return 1;
				return 0;
			})
			.map((c) => {
				const { flags: _flags, ...channel } = c;
				return channel;
			});

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
			Arr.map(sortedThreads, (thread) => firstMessages[thread.id] ?? null),
			Predicate.isNotNull,
		);

		const enrichedMessages = await enrichMessages(ctx, messages);

		const enrichedMessagesMap = new Map(
			enrichedMessages.map((em) => [em.message.id, em]),
		);

		const threadsWithMessages = Arr.filter(
			Arr.map(sortedThreads, (thread) => {
				const message = firstMessages[thread.id];
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
