import type { GenericDatabaseReader } from "convex/server";
import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";

import { Array as Arr, Predicate } from "effect";
import type { DataModel } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	privateMutation,
	privateQuery,
	type QueryCtx,
} from "../client";
import { channelSchema, channelSettingsSchema } from "../schema";
import {
	CHANNEL_TYPE,
	DEFAULT_CHANNEL_SETTINGS,
	deleteChannelInternalLogic,
	getChannelWithSettings,
	ROOT_CHANNEL_TYPES,
	upsertChannelSettingsLogic,
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
		const channelsByType = await Promise.all(
			ROOT_CHANNEL_TYPES.map((type) =>
				ctx.db
					.query("channels")
					.withIndex("by_serverId_and_type", (q) =>
						q.eq("serverId", args.serverId).eq("type", type),
					)
					.collect(),
			),
		);

		const channels = channelsByType.flat();

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

export const findChannelsByDiscordIds = privateQuery({
	args: {
		discordIds: v.array(v.int64()),
	},
	handler: async (ctx, args) => {
		const channels = await asyncMap(args.discordIds, (id) =>
			getOneFrom(ctx.db, "channels", "by_discordChannelId", id, "id"),
		);

		const validChannels = Arr.filter(channels, Predicate.isNotNull);
		return await addSettingsToChannels(ctx, validChannels);
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
			const id = await ctx.db.insert("channels", args.channel);
			return id;
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
		return await upsertChannelSettingsLogic(ctx, args.channelId, args.settings);
	},
});

export const findChannelSettingsWithIndexingEnabled = privateQuery({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("channelSettings")
			.withIndex("by_serverId_and_indexingEnabled", (q) =>
				q.eq("serverId", args.serverId).eq("indexingEnabled", true),
			)
			.collect();
	},
});

async function getServerHeaderData(
	ctx: { db: GenericDatabaseReader<DataModel> },
	serverDiscordId: bigint,
) {
	const server = await getOneFrom(
		ctx.db,
		"servers",
		"by_discordId",
		serverDiscordId,
	);

	if (!server) return null;

	const [indexedSettings, serverPreferences] = await Promise.all([
		ctx.db
			.query("channelSettings")
			.withIndex("by_serverId_and_indexingEnabled", (q) =>
				q.eq("serverId", server.discordId).eq("indexingEnabled", true),
			)
			.collect(),
		getOneFrom(ctx.db, "serverPreferences", "by_serverId", server.discordId),
	]);

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

	const channelInviteCode = indexedSettings.find(
		(s) => s.inviteCode,
	)?.inviteCode;
	const inviteCode = server.vanityInviteCode ?? channelInviteCode;

	return {
		server: {
			...server,
			channels: indexedChannels,
			customDomain: serverPreferences?.customDomain,
			subpath: serverPreferences?.subpath,
			inviteCode,
		},
		channels: indexedChannels,
	};
}

export const getCommunityPageHeaderData = privateQuery({
	args: {
		serverDiscordId: v.int64(),
		channelDiscordId: v.optional(v.int64()),
	},
	handler: async (ctx, args) => {
		const headerData = await getServerHeaderData(ctx, args.serverDiscordId);
		if (!headerData) return null;

		if (!args.channelDiscordId) {
			return {
				...headerData,
				selectedChannel: null,
			};
		}

		const channel = await getChannelWithSettings(ctx, args.channelDiscordId);
		if (!channel || channel.serverId !== headerData.server.discordId)
			return null;

		return {
			...headerData,
			selectedChannel: channel,
		};
	},
});

export const resetServerIndexingSnowflakes = internalMutation({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		const indexedChannels = await ctx.db
			.query("channelSettings")
			.withIndex("by_serverId_and_indexingEnabled", (q) =>
				q.eq("serverId", args.serverId).eq("indexingEnabled", true),
			)
			.collect();

		await asyncMap(indexedChannels, (channel) =>
			ctx.db.patch(channel._id, {
				lastIndexedSnowflake: undefined,
			}),
		);
	},
});
