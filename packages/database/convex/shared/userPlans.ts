export const USER_PLANS = {
	FREE: {
		name: "Free",
		messagesPerMonth: 20,
		dailyReset: true,
		priceId: null,
		priceAmount: 0,
	},
	PRO: {
		name: "Pro",
		messagesPerMonth: 1500,
		dailyReset: false,
		priceId: process.env.STRIPE_USER_PRO_PRICE_ID ?? null,
		priceAmount: 500,
	},
} as const;

export type UserPlanType = keyof typeof USER_PLANS;

export function getPlanFromPriceId(priceId: string): UserPlanType {
	if (priceId === USER_PLANS.PRO.priceId) return "PRO";
	return "FREE";
}

export function getPlanConfig(plan: UserPlanType) {
	return USER_PLANS[plan];
}
