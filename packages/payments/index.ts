import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2022-11-15',
	typescript: true,
});

export async function fetchSubscriptionInfo(subscriptionId: string) {
	const data = await stripe.subscriptions.retrieve(subscriptionId);
	const isTrialActive = data.trial_end
		? new Date() < new Date(data.trial_end * 1000)
		: false;

	return {
		...data,
		isTrialActive,
	};
}

export function updateServerCustomerName(input: {
	customerId: string;
	name: string;
}) {
	return stripe.customers.update(input.customerId, {
		name: input.name,
	});
}
export function createNewCustomer(name: string) {
	return stripe.customers.create({
		name,
	});
}

export function createProPlanCheckoutSession(input: {
	customerId: string;
	successUrl: string;
	cancelUrl: string;
}) {
	return createPlanCheckoutSession({
		...input,
		planId: process.env.STRIPE_PRO_PLAN_PRICE_ID!,
	});
}

export function createEnterprisePlanCheckoutSession(input: {
	customerId: string;
	successUrl: string;
	cancelUrl: string;
}) {
	return createPlanCheckoutSession({
		...input,
		planId: process.env.STRIPE_ENTERPRISE_PLAN_PRICE_ID!,
	});
}

export function createPlanCheckoutSession(input: {
	customerId: string;
	successUrl: string;
	cancelUrl: string;
	planId: string;
}) {
	return stripe.checkout.sessions.create({
		billing_address_collection: 'auto',
		line_items: [
			{
				// base
				price: input.planId,
				quantity: 1,
			},
		],
		mode: 'subscription',
		subscription_data: {
			trial_period_days: 14,
			trial_settings: {
				end_behavior: {
					missing_payment_method: 'cancel',
				},
			},
		},
		success_url: input.successUrl,
		cancel_url: input.cancelUrl,
		currency: 'USD',
		allow_promotion_codes: false,
		customer: input.customerId,
	});
}
