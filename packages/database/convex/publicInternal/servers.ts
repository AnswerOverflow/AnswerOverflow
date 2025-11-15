import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { publicInternalMutation, publicInternalQuery } from "../client";
import { serverSchema } from "../schema";

const DEFAULT_CHANNEL_SETTINGS = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

export const createServerExternal = publicInternalMutation({
	args: {
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		// Check if server already exists
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

export const updateServerExternal = publicInternalMutation({
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

export const upsertServerExternal = publicInternalMutation({
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
			// Check if we need to clear kickedTime
			// If kickedTime is explicitly undefined in args.data and existing server has it set, clear it
			const shouldClearKickedTime =
				args.data.kickedTime === undefined &&
				existing.kickedTime !== undefined &&
				existing.kickedTime !== null;

			if (shouldClearKickedTime) {
				// Use replace to clear optional fields
				const { _id, _creationTime, ...existingData } = existing;
				await ctx.db.replace(existing._id, {
					...existingData,
					...args.data,
					kickedTime: undefined,
					_id,
					_creationTime,
				});
			} else {
				// Use patch for normal updates
				await ctx.db.patch(existing._id, args.data);
			}
			return existing._id;
		}
		return await ctx.db.insert("servers", args.data);
	},
});

export const upsertServer = publicInternalMutation({
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

/**
 * Public internal query: Get all servers
 * Requires backend access token - returns all server data
 */
export const getAllServers = publicInternalQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

export const getBiggestServers = publicInternalQuery({
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

export const getServerByDiscordId = publicInternalQuery({
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

export const findManyServersById = publicInternalQuery({
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

export const createServer = publicInternalMutation({
	args: serverSchema,
	handler: async (ctx, args) => {
		// Check if server already exists
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

export const updateServer = publicInternalMutation({
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

export const getServerByDiscordIdWithChannels = publicInternalQuery({
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
			server._id,
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
			.map((c) => {
				// Return channel object without flags
				const { flags: _flags, ...channel } = c;
				return channel;
			});
		return {
			server,
			channels,
		};
	},
});
