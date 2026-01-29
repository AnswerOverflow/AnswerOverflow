import { components } from "../_generated/api";
import { authenticatedQuery } from "../client";
import { authComponent } from "../shared/betterAuth";
import { USER_PLANS } from "../shared/userPlans";

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

		const userProPriceId = USER_PLANS.PRO.priceId;
		const subscriptions = await ctx.runQuery(
			components.stripe.public.listSubscriptionsByUserId,
			{ userId: user._id },
		);

		const activeSubscription = subscriptions.find(
			(s) =>
				(s.status === "active" || s.status === "trialing") &&
				s.priceId === userProPriceId,
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
