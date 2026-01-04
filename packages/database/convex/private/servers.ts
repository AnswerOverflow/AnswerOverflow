import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { internal } from "../_generated/api";
import {
	internalAction,
	internalMutation,
	internalQuery,
	privateMutation,
	privateQuery,
} from "../client";
import { serverSchema } from "../schema";
import { CHANNEL_TYPE } from "../shared/shared";

export type BrowsableServer = {
	discordId: string;
	name: string;
	icon: string | null;
	description: string | null;
	approximateMemberCount: number;
};

const DELETE_BATCH_SIZE = 500;

export const hardDeleteServer = internalAction({
	args: {
		discordId: v.int64(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		if (process.env.ALLOW_HARD_DELETE !== "true") {
			throw new Error("Hard delete is not allowed");
		}

		let hasMoreMessages = true;
		while (hasMoreMessages) {
			hasMoreMessages = await ctx.runMutation(
				internal.private.servers.deleteServerMessagesBatch,
				{ discordId: args.discordId },
			);
		}

		await ctx.runMutation(internal.private.servers.deleteServerMetadata, {
			discordId: args.discordId,
		});

		return null;
	},
});

export const deleteServerMessagesBatch = internalMutation({
	args: {
		discordId: v.int64(),
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.discordId))
			.take(DELETE_BATCH_SIZE);

		for (const message of messages) {
			const attachments = await getManyFrom(
				ctx.db,
				"attachments",
				"by_messageId",
				message.id,
			);
			for (const attachment of attachments) {
				await ctx.db.delete(attachment._id);
			}

			const reactions = await getManyFrom(
				ctx.db,
				"reactions",
				"by_messageId",
				message.id,
			);
			for (const reaction of reactions) {
				await ctx.db.delete(reaction._id);
			}

			await ctx.db.delete(message._id);
		}

		return messages.length === DELETE_BATCH_SIZE;
	},
});

export const deleteServerMetadata = internalMutation({
	args: {
		discordId: v.int64(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.discordId,
		);
		if (!server) {
			return null;
		}

		const serverPreferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.discordId,
		);
		if (serverPreferences) {
			await ctx.db.delete(serverPreferences._id);
		}

		const channels = await getManyFrom(
			ctx.db,
			"channels",
			"by_serverId",
			args.discordId,
		);
		for (const channel of channels) {
			await ctx.db.delete(channel._id);
		}

		const channelSettings = await getManyFrom(
			ctx.db,
			"channelSettings",
			"by_serverId",
			args.discordId,
		);
		for (const settings of channelSettings) {
			await ctx.db.delete(settings._id);
		}

		const userServerSettings = await getManyFrom(
			ctx.db,
			"userServerSettings",
			"by_serverId",
			args.discordId,
		);
		for (const uss of userServerSettings) {
			await ctx.db.delete(uss._id);
		}

		await ctx.db.delete(server._id);

		return null;
	},
});

export const upsertServer = privateMutation({
	args: serverSchema,
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.discordId,
		);
		if (existing) {
			await ctx.db.patch(existing._id, {
				...args,
				kickedTime: undefined,
			});
			return { isNew: false };
		}
		await ctx.db.insert("servers", {
			...args,
			kickedTime: undefined,
		});
		return { isNew: true };
	},
});

export const updateServer = privateMutation({
	args: {
		serverId: v.int64(),
		server: serverSchema.partial(),
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverId,
		);
		if (!existing) {
			throw new Error(`Server with id ${args.serverId} not found`);
		}
		return await ctx.db.patch(existing._id, args.server);
	},
});

export const getAllServers = privateQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

export const getBrowseServers = privateQuery({
	args: {},
	handler: async (ctx) => {
		const allServers = await ctx.db.query("servers").collect();

		const nonKickedServers = allServers.filter(
			(server) => server.kickedTime === undefined || server.kickedTime === null,
		);

		const filteredServers: typeof nonKickedServers = [];

		for (const server of nonKickedServers) {
			const hasIndexingEnabled = await ctx.db
				.query("channelSettings")
				.withIndex("by_serverId_and_indexingEnabled", (q) =>
					q.eq("serverId", server.discordId).eq("indexingEnabled", true),
				)
				.first();

			if (hasIndexingEnabled) {
				filteredServers.push(server);
			}
		}

		return filteredServers.sort(
			(a, b) => b.approximateMemberCount - a.approximateMemberCount,
		);
	},
});

export const getServerByDiscordId = privateQuery({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args) => {
		return getOneFrom(ctx.db, "servers", "by_discordId", args.discordId);
	},
});

export const getServerByDiscordIdInternal = internalQuery({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args) => {
		return getOneFrom(ctx.db, "servers", "by_discordId", args.discordId);
	},
});

export const getServerByDomain = privateQuery({
	args: {
		domain: v.string(),
	},
	handler: async (ctx, args) => {
		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_customDomain",
			args.domain,
			"customDomain",
		);
		if (!preferences) {
			return null;
		}
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			preferences.serverId,
			"discordId",
		);
		if (!server) {
			return null;
		}
		return {
			server,
			preferences,
		};
	},
});

export const findManyServersById = privateQuery({
	args: {
		ids: v.array(v.id("servers")),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const servers = [];
		for (const id of args.ids) {
			const server = await ctx.db.get(id);
			if (server) {
				servers.push(server);
			}
		}
		return servers;
	},
});

export const findManyServersByDiscordId = privateQuery({
	args: {
		discordIds: v.array(v.int64()),
	},
	handler: async (ctx, args) => {
		if (args.discordIds.length === 0) return [];
		const servers = await asyncMap(args.discordIds, (discordId) =>
			getOneFrom(ctx.db, "servers", "by_discordId", discordId),
		);
		return Arr.filter(servers, Predicate.isNotNullable);
	},
});

export const getServerByDiscordIdWithChannels = privateQuery({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.discordId,
		);
		if (!server) {
			return null;
		}

		const [indexedSettings, serverPreferences] = await Promise.all([
			ctx.db
				.query("channelSettings")
				.withIndex("by_serverId_and_indexingEnabled", (q) =>
					q.eq("serverId", server.discordId).eq("indexingEnabled", true),
				)
				.collect(),
			getOneFrom(ctx.db, "serverPreferences", "by_serverId", server.discordId),
		]);

		const indexedChannelIds = new Set(indexedSettings.map((s) => s.channelId));

		const indexedChannels = await asyncMap(
			Array.from(indexedChannelIds),
			(channelId) =>
				getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
		);

		const channels = Arr.filter(indexedChannels, Predicate.isNotNull)
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
				customDomain: serverPreferences?.customDomain,
				subpath: serverPreferences?.subpath,
			},
			channels,
		};
	},
});

export const getBrowseServersInternal = internalQuery({
	args: {},
	handler: async (ctx) => {
		const allServers = await ctx.db.query("servers").collect();

		const nonKickedServers = allServers.filter(
			(server) => server.kickedTime === undefined || server.kickedTime === null,
		);

		const filteredServers: typeof nonKickedServers = [];

		for (const server of nonKickedServers) {
			const hasIndexingEnabled = await ctx.db
				.query("channelSettings")
				.withIndex("by_serverId_and_indexingEnabled", (q) =>
					q.eq("serverId", server.discordId).eq("indexingEnabled", true),
				)
				.first();

			if (hasIndexingEnabled) {
				filteredServers.push(server);
			}
		}

		return filteredServers.sort(
			(a, b) => b.approximateMemberCount - a.approximateMemberCount,
		);
	},
});

export const fetchBrowsableServersInternal = internalAction({
	args: {},
	handler: async (ctx): Promise<BrowsableServer[]> => {
		const servers = await ctx.runQuery(
			internal.private.servers.getBrowseServersInternal,
			{},
		);

		return servers.map((s) => ({
			discordId: s.discordId.toString(),
			name: s.name,
			icon: s.icon ?? null,
			description: s.description ?? null,
			approximateMemberCount: s.approximateMemberCount,
		}));
	},
});

export const scheduleRecommendedConfigurationCache = privateMutation({
	args: {
		serverId: v.int64(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.scheduler.runAfter(
			0,
			internal.authenticated.onboarding_action.fetchRecommendedConfiguration,
			{
				serverId: args.serverId,
			},
		);
		return null;
	},
});
