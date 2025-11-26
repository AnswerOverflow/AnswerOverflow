import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const getServerForStripe = internalQuery({
	args: {
		discordServerId: v.int64(),
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.discordServerId))
			.first();
	},
});

export const updateServerStripeCustomer = internalMutation({
	args: {
		serverId: v.int64(),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		const server = await ctx.db
			.query("servers")
			.withIndex("by_discordId", (q) => q.eq("discordId", args.serverId))
			.first();

		if (!server) {
			throw new Error("Server not found");
		}

		await ctx.db.patch(server._id, {
			stripeCustomerId: args.stripeCustomerId,
		});
	},
});

export const updateServerSubscription = internalMutation({
	args: {
		stripeCustomerId: v.string(),
		stripeSubscriptionId: v.union(v.string(), v.null()),
		plan: v.union(
			v.literal("FREE"),
			v.literal("STARTER"),
			v.literal("ADVANCED"),
			v.literal("PRO"),
			v.literal("ENTERPRISE"),
			v.literal("OPEN_SOURCE"),
		),
	},
	handler: async (ctx, args) => {
		const servers = await ctx.db.query("servers").collect();
		const server = servers.find(
			(s) => s.stripeCustomerId === args.stripeCustomerId,
		);

		if (!server) {
			throw new Error(
				`Server not found for stripe customer ${args.stripeCustomerId}`,
			);
		}

		await ctx.db.patch(server._id, {
			stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
			plan: args.plan,
		});
	},
});
