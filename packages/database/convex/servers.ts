import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { serverSchema } from "./schema";

// Channel types for root channels (forums, text, announcements)
const ALLOWED_ROOT_CHANNEL_TYPES = [0, 5, 15]; // GuildText, GuildAnnouncement, GuildForum

export const publicGetAllServers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

export const publicGetServerByDiscordId = query({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("discordId"), args.discordId))
			.first();
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
			.filter((q) => q.eq(q.field("discordId"), args.aliasOrId))
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

export const createServerExternal = mutation({
	args: {
		apiKey: v.string(),
		data: serverSchema,
	},
	handler: async (ctx, { apiKey, data }) => {
		const configuredSecret = "hello";
		if (!configuredSecret || apiKey !== configuredSecret) {
			throw new Error("Unauthorized");
		}

		// Check if server already exists
		const existing = await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("discordId"), data.discordId))
			.first();

		if (existing) {
			throw new Error(`Server with discordId ${data.discordId} already exists`);
		}

		return await ctx.db.insert("servers", data);
	},
});

export const updateServerExternal = mutation({
	args: {
		apiKey: v.string(),
		id: v.id("servers"),
		data: serverSchema,
	},
	handler: async (ctx, { apiKey, id, data }) => {
		const configuredSecret = "hello";
		if (!configuredSecret || apiKey !== configuredSecret) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new Error(`Server with id ${id} not found`);
		}

		await ctx.db.patch(id, data);
		return id;
	},
});

export const upsertServerExternal = mutation({
	args: {
		apiKey: v.string(),
		data: serverSchema,
	},
	handler: async (ctx, { apiKey, data }) => {
		const configuredSecret = "hello";
		if (!configuredSecret || apiKey !== configuredSecret) {
			throw new Error("Unauthorized");
		}

		const existing = await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("discordId"), data.discordId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, data);
			return existing._id;
		}
		return await ctx.db.insert("servers", data);
	},
});
