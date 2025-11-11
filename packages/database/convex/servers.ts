import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { publicInternalMutation } from "./publicInternal";
import { serverSchema } from "./schema";
import { getServerByDiscordId as getServerByDiscordIdShared } from "./shared";

// Channel types for root channels (forums, text, announcements)
const ALLOWED_ROOT_CHANNEL_TYPES = [0, 5, 15]; // GuildText, GuildAnnouncement, GuildForum

/**
 * Public query: Get all servers
 * No authentication required - returns public server data
 */
export const publicGetAllServers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

/**
 * Public query: Get server by Discord ID
 * No authentication required - returns public server data
 */
export const publicGetServerByDiscordId = query({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await getServerByDiscordIdShared(ctx, args.discordId);
	},
});

export const publicGetServerById = query({
	args: {
		id: v.id("servers"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const publicFindServerByAlias = query({
	args: {
		alias: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("vanityUrl"), args.alias))
			.first();
	},
});

export const publicFindServerByAliasOrId = query({
	args: {
		aliasOrId: v.string(),
	},
	handler: async (ctx, args) => {
		// Try as vanity URL first
		const byAlias = await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("vanityUrl"), args.aliasOrId))
			.first();
		if (byAlias) return byAlias;

		// Try as Discord ID
		return await ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.aliasOrId))
			.first();
	},
});

export const publicFindServerByCustomDomain = query({
	args: {
		domain: v.string(),
	},
	handler: async (ctx, args) => {
		const servers = await ctx.db.query("servers").collect();
		for (const server of servers) {
			const preferences = server.preferencesId
				? await ctx.db.get(server.preferencesId)
				: null;
			if (preferences?.customDomain === args.domain) {
				return server;
			}
		}
		return null;
	},
});

export const publicFindServerByStripeCustomerId = query({
	args: {
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
			.first();
	},
});

export const publicFindServerByStripeSubscriptionId = query({
	args: {
		stripeSubscriptionId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.filter((q) =>
				q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId),
			)
			.first();
	},
});

export const publicFindManyServersById = query({
	args: {
		ids: v.array(v.id("servers")),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];
		const results = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
		return results.filter((server) => server !== null);
	},
});

/**
 * Public query: Find many servers by Discord IDs
 * More efficient than calling publicGetServerByDiscordId multiple times
 */
export const publicFindManyServersByDiscordId = query({
	args: {
		discordIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.discordIds.length === 0) return [];
		// Use the index to query each Discord ID efficiently
		// This is still faster than multiple runQuery calls from an action
		const results = await Promise.all(
			args.discordIds.map((discordId) =>
				ctx.db
					.query("servers")
					.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
					.first(),
			),
		);
		return results.filter((server) => server !== null);
	},
});

export const publicGetBiggestServers = query({
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

export const publicFindServerByIdWithChannels = query({
	args: {
		id: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const server = await ctx.db.get(args.id);
		if (!server) return null;

		// Get all channels for this server
		const allChannels = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("serverId"), args.id))
			.collect();

		// Filter to only root channel types (forums, announcements, text)
		const rootChannels = allChannels.filter((channel) =>
			ALLOWED_ROOT_CHANNEL_TYPES.includes(channel.type),
		);

		// Sort: forums first, then announcements, then text
		const sortedChannels = rootChannels.sort((a, b) => {
			if (a.type === 15) return -1; // GuildForum
			if (b.type === 15) return 1;
			if (a.type === 5) return -1; // GuildAnnouncement
			if (b.type === 5) return 1;
			return 0;
		});

		return {
			...server,
			channels: sortedChannels,
		};
	},
});

export const createServerExternal = publicInternalMutation({
	args: {
		data: serverSchema,
	},
	handler: async (ctx, args) => {
		// Check if server already exists
		const existing = await ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.data.discordId))
			.first();

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
		const existing = await ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.data.discordId))
			.first();

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
