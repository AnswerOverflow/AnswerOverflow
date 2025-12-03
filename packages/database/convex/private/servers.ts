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

		const filteredServers: typeof nonKickedServers = [];

		for (const server of nonKickedServers) {
			const hasIndexingEnabled = await ctx.db
				.query("channelSettings")
				.withIndex("by_serverId", (q) => q.eq("serverId", server.discordId))
				.filter((q) => q.eq(q.field("indexingEnabled"), true))
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
		const [allChannels, allSettings] = await Promise.all([
			getManyFrom(ctx.db, "channels", "by_serverId", server.discordId),
			getManyFrom(ctx.db, "channelSettings", "by_serverId", server.discordId),
		]);

		const settingsByChannelId = new Map(
			allSettings.map((s) => [s.channelId, s]),
		);

		const channels = allChannels
			.map((c) => ({
				...c,
				flags: settingsByChannelId.get(c.id) ?? {
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
