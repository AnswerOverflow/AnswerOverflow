"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { manageGuildAction } from "../client";
import {
	createBillingPortalSession as createStripeBillingPortalSession,
	createCheckoutSession as createStripeCheckoutSession,
	createStripeCustomer,
	fetchSubscriptionInfo,
	STRIPE_PLAN_PRICE_IDS,
	syncStripeSubscription,
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
		plan: v.literal("ADVANCED"),
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	handler: async (ctx, args): Promise<CheckoutResult> => {
		const { discordAccountId, serverId, successUrl, cancelUrl } = args;

		const serverResult = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{ discordServerId: serverId },
		);

		if (!serverResult) {
			throw new Error("Server not found");
		}

		const server = serverResult as typeof serverResult & {
			stripeCustomerId?: string;
			stripeSubscriptionId?: string;
			plan: string;
		};

		const ensureStripeCustomer = async (): Promise<string> => {
			if (server.stripeCustomerId) {
				await updateStripeCustomerMetadata({
					customerId: server.stripeCustomerId,
					name: server.name,
					serverId: String(server.discordId),
					initiatedByUserId: String(discordAccountId),
				});
				return server.stripeCustomerId;
			}

			const customer = await createStripeCustomer({
				name: server.name,
				serverId: String(server.discordId),
				initiatedByUserId: String(discordAccountId),
			});

			await ctx.runMutation(
				internal.stripe.internal.updateServerStripeCustomer,
				{
					serverId,
					stripeCustomerId: customer.id,
				},
			);

			return customer.id;
		};

		const customerId = await ensureStripeCustomer();

		const priceId = STRIPE_PLAN_PRICE_IDS.ADVANCED;

		if (!priceId) {
			throw new Error("Price ID for ADVANCED plan not configured");
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

		const serverResult = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{ discordServerId: serverId },
		);

		if (!serverResult) {
			throw new Error("Server not found");
		}

		const server = serverResult as typeof serverResult & {
			stripeCustomerId?: string;
		};

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

		const serverResult = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{ discordServerId: serverId },
		);

		if (!serverResult) {
			throw new Error("Server not found");
		}

		const server = serverResult as typeof serverResult & {
			stripeCustomerId?: string;
			stripeSubscriptionId?: string;
		};

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

type SyncResult = {
	success: boolean;
	plan: string;
};

export const syncAfterCheckout = manageGuildAction({
	args: {},
	handler: async (ctx, args): Promise<SyncResult> => {
		const { serverId } = args;

		const serverResult = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{ discordServerId: serverId },
		);

		if (!serverResult) {
			throw new Error("Server not found");
		}

		const server = serverResult as typeof serverResult & {
			stripeCustomerId?: string;
		};

		if (!server.stripeCustomerId) {
			return { success: true, plan: "FREE" };
		}

		const subscriptionData = await syncStripeSubscription(
			server.stripeCustomerId,
		);

		if (subscriptionData.status === "active") {
			await ctx.runMutation(internal.stripe.internal.updateServerSubscription, {
				stripeCustomerId: server.stripeCustomerId,
				stripeSubscriptionId: subscriptionData.subscriptionId,
				plan: subscriptionData.plan,
			});
			return { success: true, plan: subscriptionData.plan };
		}

		await ctx.runMutation(internal.stripe.internal.updateServerSubscription, {
			stripeCustomerId: server.stripeCustomerId,
			stripeSubscriptionId: null,
			plan: "FREE",
		});
		return { success: true, plan: "FREE" };
	},
});
