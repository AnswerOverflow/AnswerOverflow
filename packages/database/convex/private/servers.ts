import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { privateMutation, privateQuery } from "../client";
import { planValidator, serverSchema } from "../schema";
import { CHANNEL_TYPE, isThreadType } from "../shared/shared";

const DEFAULT_CHANNEL_SETTINGS = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

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
			ctx.db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
				.first(),
		);
		return Arr.filter(servers, Predicate.isNotNullable);
	},
});

export const clearKickedTime = privateMutation({
	args: {
		id: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new Error(`Server with id ${args.id} not found`);
		}
		await ctx.db.patch(args.id, { kickedTime: undefined });
		return args.id;
	},
});

// TODO: Just have upsert get rid of this
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
		discordId: v.int64(),
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

export const findByDiscordId = privateQuery({
	args: {
		discordServerId: v.int64(),
	},
	handler: async (ctx, args) => {
		return getOneFrom(ctx.db, "servers", "by_discordId", args.discordServerId);
	},
});

export const updateStripeCustomer = privateMutation({
	args: {
		serverId: v.int64(),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverId,
		);

		if (!server) {
			throw new Error("Server not found");
		}

		await ctx.db.patch(server._id, {
			stripeCustomerId: args.stripeCustomerId,
		});
	},
});

export const updateStripeSubscription = privateMutation({
	args: {
		serverId: v.int64(),
		stripeSubscriptionId: v.union(v.string(), v.null()),
		plan: planValidator,
	},
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverId,
		);

		if (!server) {
			throw new Error("Server not found");
		}

		await ctx.db.patch(server._id, {
			stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
			plan: args.plan,
		});
	},
});

export const findServerByStripeCustomerId = privateQuery({
	args: {
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		return getOneFrom(
			ctx.db,
			"servers",
			"by_stripeCustomerId",
			args.stripeCustomerId,
		);
	},
});
