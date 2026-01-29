import { components } from "../_generated/api";
import { authenticatedQuery } from "../client";
import { authComponent } from "../shared/betterAuth";

export const getUserSubscription = authenticatedQuery({
	args: {},
	handler: async (ctx, args) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return { plan: "FREE" as const, subscription: null };
		}

		if (user.isAnonymous) {
			return { plan: "FREE" as const, subscription: null };
		}

		const subscriptions = await ctx.runQuery(
			components.stripe.public.listSubscriptionsByUserId,
			{ userId: user._id },
		);

		const activeSubscription = subscriptions.find(
			(s) => s.status === "active" || s.status === "trialing",
		);

		if (activeSubscription) {
			return {
				plan: "PRO" as const,
				subscription: {
					id: activeSubscription.stripeSubscriptionId,
					status: activeSubscription.status,
					currentPeriodEnd: activeSubscription.currentPeriodEnd,
					cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
				},
			};
		}

		return { plan: "FREE" as const, subscription: null };
	},
});
