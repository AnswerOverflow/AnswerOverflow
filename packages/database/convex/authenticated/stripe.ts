import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { getDiscordAccountWithToken } from "../shared/auth";
import type { ActionCtx } from "../client";

async function requireAuth(ctx: ActionCtx) {
	const account = await getDiscordAccountWithToken(ctx);
	if (!account) {
		throw new Error("Not authenticated");
	}
	return account;
}

type CheckoutResult = {
	url: string | null;
	sessionId: string;
	hasSubscribedInPast: boolean;
};

type BillingPortalResult = {
	url: string;
};

type SubscriptionInfoResult =
	| {
			status: "active";
			subscriptionId: string;
			subscriptionStatus: string;
			cancelAt: number | null;
			currentPeriodEnd: number;
			trialEnd: number | null;
			isTrialActive: boolean;
			cancelAtPeriodEnd: boolean;
	  }
	| {
			status: "inactive";
			hasSubscribedBefore: boolean;
	  };

export const createCheckoutSession = action({
	args: {
		serverId: v.int64(),
		plan: v.union(v.literal("STARTER"), v.literal("ADVANCED")),
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	returns: v.object({
		url: v.union(v.string(), v.null()),
		sessionId: v.string(),
		hasSubscribedInPast: v.boolean(),
	}),
	handler: async (ctx, args): Promise<CheckoutResult> => {
		await requireAuth(ctx);
		const result: CheckoutResult = await ctx.runAction(
			internal.authenticated.stripe_actions.createCheckoutSessionAction,
			args,
		);
		return result;
	},
});

export const createBillingPortalSession = action({
	args: {
		serverId: v.int64(),
		returnUrl: v.string(),
	},
	returns: v.object({
		url: v.string(),
	}),
	handler: async (ctx, args): Promise<BillingPortalResult> => {
		await requireAuth(ctx);
		const result: BillingPortalResult = await ctx.runAction(
			internal.authenticated.stripe_actions.createBillingPortalSessionAction,
			args,
		);
		return result;
	},
});

export const getSubscriptionInfo = action({
	args: {
		serverId: v.int64(),
	},
	returns: v.union(
		v.object({
			status: v.literal("active"),
			subscriptionId: v.string(),
			subscriptionStatus: v.string(),
			cancelAt: v.union(v.number(), v.null()),
			currentPeriodEnd: v.number(),
			trialEnd: v.union(v.number(), v.null()),
			isTrialActive: v.boolean(),
			cancelAtPeriodEnd: v.boolean(),
		}),
		v.object({
			status: v.literal("inactive"),
			hasSubscribedBefore: v.boolean(),
		}),
	),
	handler: async (ctx, args): Promise<SubscriptionInfoResult> => {
		await requireAuth(ctx);
		const result: SubscriptionInfoResult = await ctx.runAction(
			internal.authenticated.stripe_actions.getSubscriptionInfoAction,
			args,
		);
		return result;
	},
});
