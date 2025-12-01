import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { privateMutation, privateQuery } from "../client";
import { serverSchema } from "../schema";
import {
	CHANNEL_TYPE,
	DEFAULT_CHANNEL_SETTINGS,
	isThreadType,
} from "../shared/shared";

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

		const serverDiscordIds = nonKickedServers.map((server) => server.discordId);

		const consentingUserCounts: Array<{ serverId: bigint; count: number }> = [];
		for (const serverId of serverDiscordIds) {
			const settings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_serverId",
				serverId,
			);

			const count = settings.filter(
				(setting) => setting.canPubliclyDisplayMessages === true,
			).length;

			consentingUserCounts.push({ serverId, count });
		}

		const consentingUserCountMap = new Map(
			consentingUserCounts.map((result) => [result.serverId, result.count]),
		);

		const preferencesPromises = nonKickedServers.map(async (server) => {
			const preferences = await getOneFrom(
				ctx.db,
				"serverPreferences",
				"by_serverId",
				server.discordId,
			);
			return { serverId: server.discordId, preferences };
		});

		const preferencesResults = await Promise.all(preferencesPromises);
		const preferencesMap = new Map(
			preferencesResults.map((result) => [result.serverId, result.preferences]),
		);

		const filteredServers = nonKickedServers.filter((server) => {
			const consentingUserCount =
				consentingUserCountMap.get(server.discordId) ?? 0;
			if (consentingUserCount > 10) return true;

			const preferences = preferencesMap.get(server.discordId);
			if (preferences?.considerAllMessagesPublicEnabled === true) return true;

			return false;
		});

		return filteredServers.sort((a, b) => a.name.localeCompare(b.name));
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
		const allChannels = await getManyFrom(
			ctx.db,
			"channels",
			"by_serverId",
			server.discordId,
		);

		const channelIds = allChannels.map((c) => c.id);
		const allSettings = await asyncMap(channelIds, (id) =>
			getOneFrom(ctx.db, "channelSettings", "by_channelId", id),
		);

		const channels = allChannels
			.map((c, idx) => ({
				...c,
				flags: allSettings[idx] ?? {
					...DEFAULT_CHANNEL_SETTINGS,
					channelId: c.id,
				},
			}))
			.filter((c) => c.flags.indexingEnabled)
			.filter((c) => !isThreadType(c.type))
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
		return {
			server,
			channels,
		};
	},
});
