import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const issue = mutation({
	args: {
		name: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.name) {
			const existingApiKey = await ctx.db
				.query("apiKeys")
				.withIndex("name", (q) => q.eq("name", args.name))
				.first();
			if (existingApiKey) {
				console.warn(`API key ${args.name} already exists, deleting...`);
				await ctx.db.delete(existingApiKey._id);
			}
		}
		const apiKey = await ctx.db.insert("apiKeys", args);
		return apiKey;
	},
	returns: v.id("apiKeys"),
});

export const validate = query({
	args: {
		apiKey: v.id("apiKeys"),
	},
	handler: async (ctx, args) => {
		const apiKey = await ctx.db.get(args.apiKey);
		if (!apiKey) {
			throw new Error("Invalid API key");
		}
		return true;
	},
	returns: v.boolean(),
});

export const destroy = mutation({
	args: v.object({
		apiKey: v.optional(v.id("apiKeys")),
		name: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		if (args.apiKey) {
			const apiKey = await ctx.db.get(args.apiKey);
			if (!apiKey) {
				return "missing";
			}
			if (apiKey.name !== args.name) {
				return "name mismatch";
			}
			await ctx.db.delete(args.apiKey);
		} else if (args.name) {
			const apiKey = await ctx.db
				.query("apiKeys")
				.withIndex("name", (q) => q.eq("name", args.name))
				.first();
			if (!apiKey) {
				return "missing";
			}
			await ctx.db.delete(apiKey._id);
		} else {
			return "must provide either apiKey or name";
		}
		return "deleted";
	},
	returns: v.union(
		v.literal("missing"),
		v.literal("deleted"),
		v.literal("name mismatch"),
		v.literal("must provide either apiKey or name"),
	),
});
