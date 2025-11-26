import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./client";
import { authComponent, createAuth } from "./shared/betterAuth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

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
