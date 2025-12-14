"use node";

import { v } from "convex/values";
import type Stripe from "stripe";
import { internal } from "../_generated/api";
import { internalAction } from "../client";
import {
	syncStripeSubscription,
	verifyWebhookSignature,
} from "../shared/stripe";

const HANDLED_EVENTS = [
	"checkout.session.completed",
	"customer.subscription.created",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"customer.subscription.paused",
	"customer.subscription.resumed",
	"customer.subscription.pending_update_applied",
	"customer.subscription.pending_update_expired",
	"customer.subscription.trial_will_end",
	"invoice.paid",
	"invoice.payment_failed",
	"invoice.payment_action_required",
	"invoice.upcoming",
	"invoice.marked_uncollectible",
	"invoice.payment_succeeded",
	"payment_intent.succeeded",
	"payment_intent.payment_failed",
	"payment_intent.canceled",
] as const;

type HandledEvent = (typeof HANDLED_EVENTS)[number];

function extractCustomerId(event: Stripe.Event): string | null {
	const obj = event.data.object;

	if ("customer" in obj && obj.customer) {
		return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
	}

	return null;
}

export const handleStripeWebhook = internalAction({
	args: {
		payload: v.string(),
		signature: v.string(),
	},
	handler: async (ctx, args) => {
		const event = verifyWebhookSignature(args.payload, args.signature);

		if (!HANDLED_EVENTS.includes(event.type as HandledEvent)) {
			return { success: true };
		}

		const customerId = extractCustomerId(event);
		if (!customerId) {
			console.error(
				`[STRIPE HOOK] No customer ID found for event type: ${event.type}`,
			);
			return { success: true };
		}

		const subscriptionData = await syncStripeSubscription(customerId);

		if (subscriptionData.status === "active") {
			await ctx.runMutation(internal.stripe.internal.updateServerSubscription, {
				stripeCustomerId: customerId,
				stripeSubscriptionId: subscriptionData.subscriptionId,
				plan: subscriptionData.plan,
			});
		} else {
			await ctx.runMutation(internal.stripe.internal.updateServerSubscription, {
				stripeCustomerId: customerId,
				stripeSubscriptionId: null,
				plan: "FREE",
			});
		}

		return { success: true };
	},
});
