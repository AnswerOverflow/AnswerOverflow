import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { internalMutation, internalQuery } from "../client";
import { planValidator } from "../schema";

export const getServerForStripe = internalQuery({
	args: {
		discordServerId: v.int64(),
	},
	handler: async (ctx, args) => {
		return getOneFrom(ctx.db, "servers", "by_discordId", args.discordServerId);
	},
});

export const updateServerStripeCustomer = internalMutation({
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

export const updateServerSubscription = internalMutation({
	args: {
		stripeCustomerId: v.string(),
		stripeSubscriptionId: v.union(v.string(), v.null()),
		plan: planValidator,
	},
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_stripeCustomerId",
			args.stripeCustomerId,
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
