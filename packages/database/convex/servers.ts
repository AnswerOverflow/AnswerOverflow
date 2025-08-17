import { v } from "convex/values";
import { customMutation } from "convex-helpers/server/customFunctions";
import { mutation, query } from "./_generated/server";
import { serverSchema } from "./schema";

const apiMutation = customMutation(mutation, {
	args: { apiKey: v.string() },
	input: async (ctx, args) => {
		const configuredSecret = "hello";
		if (!configuredSecret || args.apiKey !== configuredSecret) {
			throw new Error("Unauthorized");
		}
		return { ctx, args };
	},
});

export const publicGetServers = query({
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

export const upsertServerExternal = apiMutation({
	args: {
		data: serverSchema,
	},
	handler: async (ctx, { data }) => {
		const existing = await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("discordId"), data.discordId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, data);
		}
		return await ctx.db.insert("servers", data);
	},
});
