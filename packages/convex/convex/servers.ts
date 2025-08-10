import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Auth } from "convex/server";
import { serverSchema } from "./schema";
import { api } from "./_generated/api";

export const getUserId = async (ctx: { auth: Auth }) => {
	return (await ctx.auth.getUserIdentity())?.subject;
};

export const getServers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

export const getServerByDiscordId = query({
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

export const upsertServer = internalMutation({
	args: serverSchema,
	handler: async (ctx, args) => {
		const existing = await ctx.runQuery(api.servers.getServerByDiscordId, {
			discordId: args.discordId,
		});
		if (existing) {
			return await ctx.db.patch(existing._id, args);
		}
		return await ctx.db.insert("servers", args);
	},
});
