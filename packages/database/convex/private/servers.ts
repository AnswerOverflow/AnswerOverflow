import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { privateMutation, privateQuery } from "../client";
import { serverSchema } from "../schema";
import { CHANNEL_TYPE } from "../shared/shared";

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
