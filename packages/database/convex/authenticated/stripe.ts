"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { authenticatedAction } from "../client";
import { requireAuthWithManageGuild } from "../shared/auth";
import {
	createStripeCustomer,
	createCheckoutSession as createStripeCheckoutSession,
	createBillingPortalSession as createStripeBillingPortalSession,
	fetchSubscriptionInfo,
	STRIPE_PLAN_PRICE_IDS,
	updateStripeCustomerMetadata,
} from "../shared/stripe";

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

export const createCheckoutSession = authenticatedAction({
	args: {
		serverId: v.int64(),
		plan: v.union(v.literal("STARTER"), v.literal("ADVANCED")),
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	handler: async (ctx, args): Promise<CheckoutResult> => {
		const { discordAccountId, serverId, plan, successUrl, cancelUrl } = args;

		await requireAuthWithManageGuild(ctx, serverId);

		const server = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{ discordServerId: serverId },
		);

		if (!server) {
			throw new Error("Server not found");
		}

		let customerId = server.stripeCustomerId;
		if (!customerId) {
			const customer = await createStripeCustomer({
				name: server.name,
				serverId: String(server.discordId),
				initiatedByUserId: String(discordAccountId),
			});
			customerId = customer.id;

			await ctx.runMutation(
				internal.stripe.internal.updateServerStripeCustomer,
				{
					serverId,
					stripeCustomerId: customerId,
				},
			);
		} else {
			await updateStripeCustomerMetadata({
				customerId,
				name: server.name,
				serverId: String(server.discordId),
				initiatedByUserId: String(discordAccountId),
			});
		}

		const priceId =
			plan === "STARTER"
				? STRIPE_PLAN_PRICE_IDS.STARTER
				: STRIPE_PLAN_PRICE_IDS.ADVANCED;

		if (!priceId) {
			throw new Error(`Price ID for plan ${plan} not configured`);
		}

		return createStripeCheckoutSession({
			customerId,
			priceId,
			successUrl,
			cancelUrl,
		});
	},
});

export const createBillingPortalSession = authenticatedAction({
	args: {
		serverId: v.int64(),
		returnUrl: v.string(),
	},
	handler: async (ctx, args): Promise<BillingPortalResult> => {
		const { serverId, returnUrl } = args;

		await requireAuthWithManageGuild(ctx, serverId);

		const server = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{ discordServerId: serverId },
		);

		if (!server) {
			throw new Error("Server not found");
		}

		if (!server.stripeCustomerId) {
			throw new Error("Server does not have a Stripe customer");
		}

		return createStripeBillingPortalSession({
			customerId: server.stripeCustomerId,
			returnUrl,
		});
	},
});

export const getSubscriptionInfo = authenticatedAction({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args): Promise<SubscriptionInfoResult> => {
		const { serverId } = args;

		await requireAuthWithManageGuild(ctx, serverId);

		const server = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{ discordServerId: serverId },
		);

		if (!server) {
			throw new Error("Server not found");
		}

		if (!server.stripeSubscriptionId) {
			return {
				status: "inactive" as const,
				hasSubscribedBefore: !!server.stripeCustomerId,
			};
		}

		const subscriptionInfo = await fetchSubscriptionInfo(
			server.stripeSubscriptionId,
		);

		return {
			status: "active" as const,
			subscriptionId: subscriptionInfo.id,
			subscriptionStatus: subscriptionInfo.status,
			cancelAt: subscriptionInfo.cancelAt,
			currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
			trialEnd: subscriptionInfo.trialEnd,
			isTrialActive: subscriptionInfo.isTrialActive,
			cancelAtPeriodEnd: subscriptionInfo.cancelAtPeriodEnd,
		};
	},
});
