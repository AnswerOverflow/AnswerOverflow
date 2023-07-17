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

export function createCheckoutSession(input: {
	customerId: string;
	successUrl: string;
	cancelUrl: string;
}) {
	return stripe.checkout.sessions.create({
		billing_address_collection: 'auto',
		line_items: [
			{
				// base
				price: process.env.STRIPE_PRO_PLAN_PRICE_ID,
				quantity: 1,
			},
			{
				// additional page views
				price: process.env.STRIPE_PAGE_VIEWS_PRICE_ID,
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
		allow_promotion_codes: true,
		customer: input.customerId,
	});
}
