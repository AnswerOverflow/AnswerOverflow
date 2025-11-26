"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../client";
import {
	createStripeCustomer,
	createCheckoutSession,
	createBillingPortalSession,
	fetchSubscriptionInfo,
	STRIPE_PLAN_PRICE_IDS,
	updateStripeCustomerMetadata,
	verifyWebhookSignature,
	getPlanFromPriceId,
} from "../shared/stripe";
import { getDiscordAccountWithToken } from "../shared/auth";
import type Stripe from "stripe";

async function requireAuth(ctx: ActionCtx) {
	const account = await getDiscordAccountWithToken(ctx);
	if (!account) {
		throw new Error("Not authenticated");
	}
	return account;
}

export const ensureStripeCustomer = internalAction({
	args: {
		serverId: v.int64(),
	},
	returns: v.string(),
	handler: async (ctx, args): Promise<string> => {
		await requireAuth(ctx);

		const server = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{
				discordServerId: args.serverId,
			},
		);

		if (!server) {
			throw new Error("Server not found");
		}

		if (server.stripeCustomerId) {
			await updateStripeCustomerMetadata({
				customerId: server.stripeCustomerId,
				name: server.name,
				serverId: String(server.discordId),
			});
			return server.stripeCustomerId;
		}

		const customer = await createStripeCustomer({
			name: server.name,
			serverId: String(server.discordId),
		});

		await ctx.runMutation(internal.stripe.internal.updateServerStripeCustomer, {
			serverId: args.serverId,
			stripeCustomerId: customer.id,
		});

		return customer.id;
	},
});

export const createCheckoutSessionAction = internalAction({
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
	handler: async (ctx, args) => {
		await requireAuth(ctx);

		const server = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{
				discordServerId: args.serverId,
			},
		);

		if (!server) {
			throw new Error("Server not found");
		}

		let customerId = server.stripeCustomerId;
		if (!customerId) {
			const customer = await createStripeCustomer({
				name: server.name,
				serverId: String(server.discordId),
			});
			customerId = customer.id;

			await ctx.runMutation(
				internal.stripe.internal.updateServerStripeCustomer,
				{
					serverId: args.serverId,
					stripeCustomerId: customerId,
				},
			);
		}

		const priceId =
			args.plan === "STARTER"
				? STRIPE_PLAN_PRICE_IDS.STARTER
				: STRIPE_PLAN_PRICE_IDS.ADVANCED;

		if (!priceId) {
			throw new Error(`Price ID for plan ${args.plan} not configured`);
		}

		const session = await createCheckoutSession({
			customerId,
			priceId,
			successUrl: args.successUrl,
			cancelUrl: args.cancelUrl,
		});

		return session;
	},
});

export const createBillingPortalSessionAction = internalAction({
	args: {
		serverId: v.int64(),
		returnUrl: v.string(),
	},
	returns: v.object({
		url: v.string(),
	}),
	handler: async (ctx, args) => {
		await requireAuth(ctx);

		const server = await ctx.runQuery(
			internal.stripe.internal.getServerForStripe,
			{
				discordServerId: args.serverId,
			},
		);

		if (!server) {
			throw new Error("Server not found");
		}

		if (!server.stripeCustomerId) {
			throw new Error("Server does not have a Stripe customer");
		}

		const session = await createBillingPortalSession({
			customerId: server.stripeCustomerId,
			returnUrl: args.returnUrl,
		});

		return session;
	},
});

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

export const getSubscriptionInfoAction = internalAction({
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

		const server: Awaited<
			ReturnType<
				typeof ctx.runQuery<typeof internal.stripe.internal.getServerForStripe>
			>
		> = await ctx.runQuery(internal.stripe.internal.getServerForStripe, {
			discordServerId: args.serverId,
		});

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

export const handleStripeWebhook = internalAction({
	args: {
		payload: v.string(),
		signature: v.string(),
	},
	returns: v.object({
		success: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const event = verifyWebhookSignature(args.payload, args.signature);

		const subscription = event.data.object as Stripe.Subscription;
		const customerId =
			typeof subscription.customer === "string"
				? subscription.customer
				: subscription.customer.id;

		switch (event.type) {
			case "customer.subscription.created":
			case "customer.subscription.updated": {
				const priceId = subscription.items.data[0]?.plan.id;
				if (!priceId) {
					throw new Error("No price ID found in subscription");
				}

				const plan = getPlanFromPriceId(priceId);

				await ctx.runMutation(
					internal.stripe.internal.updateServerSubscription,
					{
						stripeCustomerId: customerId,
						stripeSubscriptionId: subscription.id,
						plan,
					},
				);
				break;
			}

			case "customer.subscription.deleted": {
				await ctx.runMutation(
					internal.stripe.internal.updateServerSubscription,
					{
						stripeCustomerId: customerId,
						stripeSubscriptionId: null,
						plan: "FREE",
					},
				);
				break;
			}
		}

		return { success: true };
	},
});
