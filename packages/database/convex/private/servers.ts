import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { privateMutation, privateQuery } from "../client";
import { serverSchema } from "../schema";
import { CHANNEL_TYPE, isThreadType } from "../shared/shared";

const DEFAULT_CHANNEL_SETTINGS = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

export const createServerExternal = privateMutation({
	args: {
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.data.discordId,
		);

		if (existing) {
			throw new Error(
				`Server with discordId ${args.data.discordId} already exists`,
			);
		}

		return await ctx.db.insert("servers", args.data);
	},
});

export const updateServerExternal = privateMutation({
	args: {
		id: v.id("servers"),
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error(`Server with id ${args.id} not found`);
		}

		await ctx.db.patch(args.id, args.data);
		return args.id;
	},
});

export const upsertServerExternal = privateMutation({
	args: {
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.data.discordId,
		);

		if (existing) {
			const shouldClearKickedTime =
				args.data.kickedTime === undefined &&
				existing.kickedTime !== undefined &&
				existing.kickedTime !== null;

			if (shouldClearKickedTime) {
				const { _id, _creationTime, ...existingData } = existing;
				await ctx.db.replace(existing._id, {
					...existingData,
					...args.data,
					kickedTime: undefined,
					_id,
					_creationTime,
				});
			} else {
				await ctx.db.patch(existing._id, args.data);
			}
			return existing._id;
		}
		return await ctx.db.insert("servers", args.data);
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
			return await ctx.db.patch(existing._id, args);
		}
		return await ctx.db.insert("servers", args);
	},
});

export const getAllServers = privateQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

export const getBiggestServers = privateQuery({
	args: {
		take: v.number(),
	},
	handler: async (ctx, args) => {
		const allServers = await ctx.db.query("servers").collect();
		return allServers
			.sort((a, b) => b.approximateMemberCount - a.approximateMemberCount)
			.slice(0, args.take);
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

		const consentingUserCounts: Array<{ serverId: string; count: number }> = [];
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
			if (server.preferencesId) {
				const preferences = await ctx.db.get(server.preferencesId);
				return { serverId: server.discordId, preferences };
			}
			return { serverId: server.discordId, preferences: null };
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
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
			.first();
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
		console.log("preferences", preferences);
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
		discordIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.discordIds.length === 0) return [];
		const servers = await asyncMap(args.discordIds, (discordId) =>
			ctx.db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
				.first(),
		);
		return Arr.filter(servers, Predicate.isNotNullable);
	},
});

export const createServer = privateMutation({
	args: serverSchema,
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.discordId,
		);

		if (existing) {
			throw new Error(`Server with discordId ${args.discordId} already exists`);
		}

		return await ctx.db.insert("servers", args);
	},
});

export const updateServer = privateMutation({
	args: {
		id: v.id("servers"),
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error(`Server with id ${args.id} not found`);
		}

		await ctx.db.patch(args.id, args.data);
		return args.id;
	},
});

export const getServerByDiscordIdWithChannels = privateQuery({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		const server = await ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
			.first();
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
