import { ActionCache } from "@convex-dev/action-cache";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { components, internal } from "../_generated/api";
import type { BrowsableServer } from "../private/servers";
import { CHANNEL_TYPE } from "../shared/shared";
import { publicAction, publicQuery } from "./custom_functions";

export const getServerByDomain = publicQuery({
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
			preferences: {
				customDomain: preferences.customDomain,
				subpath: preferences.subpath,
			},
		};
	},
});

export const getBrowseServers = publicQuery({
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

export const getServerByDiscordIdWithChannels = publicQuery({
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

const getBrowsableServersCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.private.servers.fetchBrowsableServersInternal,
		name: "browsableServers",
		ttl: 30 * 60 * 1000, // 30 minutes
	});

export const getCachedBrowsableServers = publicAction({
	args: {},
	handler: async (ctx): Promise<BrowsableServer[]> => {
		return await getBrowsableServersCache().fetch(ctx, {});
	},
});
