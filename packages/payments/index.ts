import Stripe from 'stripe';
import { sharedEnvs } from '@answeroverflow/env/shared';

const stripe = sharedEnvs.STRIPE_SECRET_KEY
	? new Stripe(sharedEnvs.STRIPE_SECRET_KEY, {
			apiVersion: '2022-11-15',
			typescript: true,
		})
	: undefined;

export async function fetchSubscriptionInfo(subscriptionId: string) {
	const data = await stripe!.subscriptions.retrieve(subscriptionId);
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
	serverId: string;
}) {
	return stripe!.customers.update(input.customerId, {
		metadata: {
			server_name: input.name,
			server_id: input.serverId,
		},
	});
}
export function createNewCustomer(input: { name: string; serverId: string }) {
	const { name } = input;
	return stripe!.customers.create({
		name,
		description: `${name} Community`,
		metadata: {
			server_name: name,
			server_id: input.serverId,
		},
	});
}

export function createProPlanCheckoutSession(input: {
	customerId: string;
	successUrl: string;
	cancelUrl: string;
}) {
	return createPlanCheckoutSession({
		...input,
		planId: sharedEnvs.STRIPE_PRO_PLAN_PRICE_ID!,
	});
}

export function createEnterprisePlanCheckoutSession(input: {
	customerId: string;
	successUrl: string;
	cancelUrl: string;
}) {
	return createPlanCheckoutSession({
		...input,
		planId: sharedEnvs.STRIPE_ENTERPRISE_PLAN_PRICE_ID!,
	});
}

export async function createPlanCheckoutSession(input: {
	customerId: string;
	successUrl: string;
	cancelUrl: string;
	planId: string;
}) {
	const previousSubscriptions = await stripe!.subscriptions.list({
		customer: input.customerId,
		status: 'all',
	});
	const hasSubscribedInPast = previousSubscriptions.data.length > 0;

	const data = await stripe!.checkout.sessions.create({
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
			trial_period_days: hasSubscribedInPast ? undefined : 14,
			trial_settings: {
				end_behavior: {
					missing_payment_method: 'cancel',
				},
			},
		},
		success_url: input.successUrl,
		automatic_tax: {
			enabled: true,
		},
		customer_update: {
			address: 'auto',
			name: 'auto',
		},
		tax_id_collection: {
			enabled: true,
		},
		cancel_url: input.cancelUrl,
		currency: 'USD',
		allow_promotion_codes: false,
		customer: input.customerId,
	});
	return {
		...data,
		hasSubscribedInPast,
	};
}
