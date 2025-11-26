"use node";

import { v } from "convex/values";
import type Stripe from "stripe";
import { internal } from "../_generated/api";
import { internalAction } from "../client";
import { getPlanFromPriceId, verifyWebhookSignature } from "../shared/stripe";

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
