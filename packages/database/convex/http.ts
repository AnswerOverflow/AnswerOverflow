import { registerRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";
import type Stripe from "stripe";
import { components, internal } from "./_generated/api";
import { httpAction } from "./client";
import { authComponent, createAuth } from "./shared/betterAuth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
	const item = subscription.items.data[0];
	return {
		periodStart: item?.current_period_start ?? 0,
		periodEnd: item?.current_period_end ?? 0,
	};
}

registerRoutes(http, components.stripe, {
	webhookPath: "/stripe/user-webhook",
	STRIPE_WEBHOOK_SECRET: process.env.STRIPE_USER_WEBHOOK_SECRET,
	events: {
		"customer.subscription.created": async (ctx, event) => {
			const subscription = event.data.object;
			const userId = subscription.metadata?.userId;
			if (userId) {
				const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);
				await ctx.runMutation(internal.chat.usage.resetUsageForSubscription, {
					userId,
					periodStart,
					periodEnd,
				});
			}
		},
		"customer.subscription.updated": async (ctx, event) => {
			const subscription = event.data.object;
			const userId = subscription.metadata?.userId;
			if (!userId) return;

			const { periodStart, periodEnd } = getSubscriptionPeriod(subscription);
			const previousItem = (
				event.data.previous_attributes as {
					items?: { data?: Stripe.SubscriptionItem[] };
				}
			)?.items?.data?.[0];

			const periodChanged =
				previousItem?.current_period_end &&
				previousItem.current_period_end !== periodEnd;

			if (periodChanged) {
				await ctx.runMutation(internal.chat.usage.resetUsageForSubscription, {
					userId,
					periodStart,
					periodEnd,
				});
			}
		},
	},
});

http.route({
	path: "/stripe/webhook",
	method: "POST",
	handler: httpAction(async (ctx, req) => {
		const signature = req.headers.get("stripe-signature");
		if (!signature) {
			return new Response("Missing stripe-signature header", { status: 400 });
		}

		const payload = await req.text();

		try {
			const result = await ctx.runAction(
				internal.authenticated.stripe_actions.handleStripeWebhook,
				{
					payload,
					signature,
				},
			);

			return new Response(JSON.stringify(result), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error) {
			console.error("Stripe webhook error:", error);
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : "Unknown error",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}),
});

export default http;
