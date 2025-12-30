import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { internalMutation, internalQuery } from "../client";
import { planValidator } from "../schema";
import { DEFAULT_SERVER_PREFERENCES } from "../shared";

export const getServerForStripe = internalQuery({
	args: {
		discordServerId: v.int64(),
	},
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.discordServerId,
		);
		if (!server) {
			return null;
		}
		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.discordServerId,
		);
		return {
			...server,
			stripeCustomerId: preferences?.stripeCustomerId,
			stripeSubscriptionId: preferences?.stripeSubscriptionId,
			plan: preferences?.plan ?? "FREE",
		};
	},
});

export const updateServerStripeCustomer = internalMutation({
	args: {
		serverId: v.int64(),
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		if (existing) {
			await ctx.db.patch(existing._id, {
				stripeCustomerId: args.stripeCustomerId,
			});
		} else {
			await ctx.db.insert("serverPreferences", {
				...DEFAULT_SERVER_PREFERENCES,
				serverId: args.serverId,
				stripeCustomerId: args.stripeCustomerId,
			});
		}
	},
});

export const updateServerSubscription = internalMutation({
	args: {
		stripeCustomerId: v.string(),
		stripeSubscriptionId: v.union(v.string(), v.null()),
		plan: planValidator,
	},
	handler: async (ctx, args) => {
		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_stripeCustomerId",
			args.stripeCustomerId,
			"stripeCustomerId",
		);

		if (!preferences) {
			throw new Error(
				`Server preferences not found for stripe customer ${args.stripeCustomerId}`,
			);
		}

		await ctx.db.patch(preferences._id, {
			stripeSubscriptionId: args.stripeSubscriptionId ?? undefined,
			plan: args.plan,
		});
	},
});
