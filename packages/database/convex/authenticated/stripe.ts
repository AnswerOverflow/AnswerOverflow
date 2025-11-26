"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { manageGuildAction } from "../client";
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

export const createCheckoutSession = manageGuildAction({
	args: {
		plan: v.union(v.literal("STARTER"), v.literal("ADVANCED")),
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	handler: async (ctx, args): Promise<CheckoutResult> => {
		const { discordAccountId, serverId, plan, successUrl, cancelUrl } = args;

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

export const createBillingPortalSession = manageGuildAction({
	args: {
		returnUrl: v.string(),
	},
	handler: async (ctx, args): Promise<BillingPortalResult> => {
		const { serverId, returnUrl } = args;

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

export const getSubscriptionInfo = manageGuildAction({
	args: {},
	handler: async (ctx, args): Promise<SubscriptionInfoResult> => {
		const { serverId } = args;

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

		const info = await fetchSubscriptionInfo(server.stripeSubscriptionId);

		return {
			status: "active" as const,
			subscriptionId: info.id,
			subscriptionStatus: info.status,
			cancelAt: info.cancelAt,
			currentPeriodEnd: info.currentPeriodEnd,
			trialEnd: info.trialEnd,
			isTrialActive: info.isTrialActive,
			cancelAtPeriodEnd: info.cancelAtPeriodEnd,
		};
	},
});
