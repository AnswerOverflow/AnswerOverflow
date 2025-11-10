import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { serverSchema } from "./schema";

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
