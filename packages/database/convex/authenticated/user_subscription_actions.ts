"use node";

import { StripeSubscriptions } from "@convex-dev/stripe";
import Stripe from "stripe";
import { components, internal } from "../_generated/api";
import { authenticatedAction } from "../client";
import { authComponent } from "../shared/betterAuth";
import { USER_PLANS } from "../shared/userPlans";

const stripeClient = new StripeSubscriptions(components.stripe, {});

function getStripeClient(): Stripe {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey) {
		throw new Error("STRIPE_SECRET_KEY environment variable is required");
	}
	return new Stripe(secretKey);
}

function getSiteUrl(): string {
	const url = process.env.SITE_URL;
	if (!url) {
		throw new Error("SITE_URL environment variable is required");
	}
	return url;
}

export const createCheckoutSession = authenticatedAction({
	args: {},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Not authenticated");
		}

		if (user.isAnonymous) {
			throw new Error(
				"Anonymous users cannot subscribe. Please sign in first.",
			);
		}

		const priceId = USER_PLANS.PRO.priceId;
		if (!priceId) {
			throw new Error("Pro plan price ID not configured");
		}

		const customer = await stripeClient.getOrCreateCustomer(ctx, {
			userId: user._id,
			email: user.email ?? undefined,
			name: user.name ?? undefined,
		});

		return stripeClient.createCheckoutSession(ctx, {
			priceId,
			customerId: customer.customerId,
			mode: "subscription",
			successUrl: `${getSiteUrl()}/chat?checkout=success`,
			cancelUrl: `${getSiteUrl()}/chat?checkout=canceled`,
			subscriptionMetadata: {
				userId: user._id,
			},
		});
	},
});

export const createBillingPortalSession = authenticatedAction({
	args: {},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Not authenticated");
		}

		const subscriptions = await ctx.runQuery(
			components.stripe.public.listSubscriptionsByUserId,
			{ userId: user._id },
		);

		if (subscriptions.length === 0) {
			throw new Error("No subscription found");
		}

		return stripeClient.createCustomerPortalSession(ctx, {
			customerId: subscriptions[0]?.stripeCustomerId ?? "",
			returnUrl: `${getSiteUrl()}/chat`,
		});
	},
});

export const syncAfterCheckout = authenticatedAction({
	args: {},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			throw new Error("Not authenticated");
		}

		const localSubscriptions = await ctx.runQuery(
			components.stripe.public.listSubscriptionsByUserId,
			{ userId: user._id },
		);

		const localActive = localSubscriptions.find(
			(s) => s.status === "active" || s.status === "trialing",
		);

		if (localActive) {
			const item = localActive;
			await ctx.runMutation(internal.chat.usage.resetUsageForSubscription, {
				userId: user._id,
				periodStart: Math.floor(Date.now() / 1000),
				periodEnd: item.currentPeriodEnd,
			});
			return { success: true, plan: "PRO" as const };
		}

		const stripe = getStripeClient();

		const stripeCustomers = await stripe.customers.search({
			query: `metadata["userId"]:"${user._id}"`,
			limit: 1,
		});

		const customer = stripeCustomers.data[0];
		if (!customer) {
			return { success: true, plan: "FREE" as const };
		}

		const stripeSubscriptions = await stripe.subscriptions.list({
			customer: customer.id,
			limit: 1,
			status: "all",
		});

		const subscription = stripeSubscriptions.data[0];
		if (
			!subscription ||
			(subscription.status !== "active" && subscription.status !== "trialing")
		) {
			return { success: true, plan: "FREE" as const };
		}

		const item = subscription.items.data[0];
		const priceId = item?.price?.id;

		await ctx.runMutation(components.stripe.private.handleSubscriptionCreated, {
			stripeSubscriptionId: subscription.id,
			stripeCustomerId: customer.id,
			status: subscription.status,
			currentPeriodEnd: item?.current_period_end ?? 0,
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			cancelAt: subscription.cancel_at ?? undefined,
			quantity: item?.quantity ?? 1,
			priceId: priceId ?? "",
			metadata: subscription.metadata,
		});

		await ctx.runMutation(internal.chat.usage.resetUsageForSubscription, {
			userId: user._id,
			periodStart: item?.current_period_start ?? 0,
			periodEnd: item?.current_period_end ?? 0,
		});

		return { success: true, plan: "PRO" as const };
	},
});
