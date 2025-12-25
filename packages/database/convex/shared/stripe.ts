import Stripe from "stripe";
import type { Plan } from "./betterAuth";

const getStripeClient = (): Stripe => {
	const secretKey = process.env.STRIPE_SECRET_KEY;
	if (!secretKey) {
		throw new Error("STRIPE_SECRET_KEY environment variable is required");
	}
	return new Stripe(secretKey, {
		apiVersion: "2025-12-15.clover",
	});
};

export const STRIPE_PLAN_PRICE_IDS = {
	STARTER: process.env.STRIPE_STARTER_PLAN_PRICE_ID,
	ADVANCED: process.env.STRIPE_ADVANCED_PLAN_PRICE_ID,
	PRO: process.env.STRIPE_PRO_PLAN_LEGACY_PRICE_ID,
	ENTERPRISE: process.env.STRIPE_ENTERPRISE_PLAN_LEGACY_PRICE_ID,
} as const;

export function getPlanFromPriceId(priceId: string): Plan {
	if (priceId === STRIPE_PLAN_PRICE_IDS.ADVANCED) return "ADVANCED";
	if (priceId === STRIPE_PLAN_PRICE_IDS.STARTER) return "ADVANCED";
	if (priceId === STRIPE_PLAN_PRICE_IDS.PRO) return "ADVANCED";
	if (priceId === STRIPE_PLAN_PRICE_IDS.ENTERPRISE) return "ADVANCED";
	throw new Error(`Unknown price ID: ${priceId}`);
}

export async function createStripeCustomer(input: {
	name: string;
	serverId: string;
	initiatedByUserId?: string;
}): Promise<Stripe.Customer> {
	const stripe = getStripeClient();
	return stripe.customers.create({
		name: input.name,
		description: `${input.name} Community`,
		metadata: {
			server_name: input.name,
			server_id: input.serverId,
			initiated_by_user_id: input.initiatedByUserId ?? "",
		},
	});
}

export async function updateStripeCustomerMetadata(input: {
	customerId: string;
	name: string;
	serverId: string;
	initiatedByUserId?: string;
}): Promise<Stripe.Customer> {
	const stripe = getStripeClient();
	return stripe.customers.update(input.customerId, {
		metadata: {
			server_name: input.name,
			server_id: input.serverId,
			initiated_by_user_id: input.initiatedByUserId ?? "",
		},
	});
}

export type SubscriptionInfo = {
	id: string;
	status: Stripe.Subscription.Status;
	cancelAt: number | null;
	currentPeriodEnd: number;
	trialEnd: number | null;
	isTrialActive: boolean;
	cancelAtPeriodEnd: boolean;
	priceId: string | undefined;
};

export async function fetchSubscriptionInfo(
	subscriptionId: string,
): Promise<SubscriptionInfo> {
	const stripe = getStripeClient();
	const data = await stripe.subscriptions.retrieve(subscriptionId);
	const isTrialActive = data.trial_end
		? new Date() < new Date(data.trial_end * 1000)
		: false;

	const firstItem = data.items.data[0];
	const currentPeriodEnd = firstItem?.current_period_end ?? 0;

	return {
		id: data.id,
		status: data.status,
		cancelAt: data.cancel_at,
		currentPeriodEnd,
		trialEnd: data.trial_end,
		isTrialActive,
		cancelAtPeriodEnd: data.cancel_at_period_end,
		priceId: firstItem?.plan.id,
	};
}

export type CheckoutSessionResult = {
	url: string | null;
	sessionId: string;
	hasSubscribedInPast: boolean;
};

export async function createCheckoutSession(input: {
	customerId: string;
	priceId: string;
	successUrl: string;
	cancelUrl: string;
}): Promise<CheckoutSessionResult> {
	const stripe = getStripeClient();

	const previousSubscriptions = await stripe.subscriptions.list({
		customer: input.customerId,
		status: "all",
	});
	const hasSubscribedInPast = previousSubscriptions.data.length > 0;

	const data = await stripe.checkout.sessions.create({
		billing_address_collection: "auto",
		line_items: [
			{
				price: input.priceId,
				quantity: 1,
			},
		],
		mode: "subscription",
		subscription_data: {
			trial_period_days: hasSubscribedInPast ? undefined : 14,
			trial_settings: {
				end_behavior: {
					missing_payment_method: "cancel",
				},
			},
		},
		success_url: input.successUrl,
		automatic_tax: {
			enabled: true,
		},
		customer_update: {
			address: "auto",
			name: "auto",
		},
		tax_id_collection: {
			enabled: true,
		},
		cancel_url: input.cancelUrl,
		currency: "USD",
		allow_promotion_codes: false,
		customer: input.customerId,
	});

	return {
		url: data.url,
		sessionId: data.id,
		hasSubscribedInPast,
	};
}

export async function createBillingPortalSession(input: {
	customerId: string;
	returnUrl: string;
}): Promise<{ url: string }> {
	const stripe = getStripeClient();
	const session = await stripe.billingPortal.sessions.create({
		customer: input.customerId,
		return_url: input.returnUrl,
	});
	return { url: session.url };
}

export type SyncedSubscriptionData =
	| {
			status: "active";
			subscriptionId: string;
			subscriptionStatus: Stripe.Subscription.Status;
			priceId: string;
			plan: Plan;
			currentPeriodStart: number;
			currentPeriodEnd: number;
			cancelAtPeriodEnd: boolean;
			cancelAt: number | null;
			trialEnd: number | null;
			isTrialActive: boolean;
	  }
	| {
			status: "none";
			plan: "FREE";
	  };

export async function syncStripeSubscription(
	customerId: string,
): Promise<SyncedSubscriptionData> {
	const stripe = getStripeClient();

	const subscriptions = await stripe.subscriptions.list({
		customer: customerId,
		limit: 1,
		status: "all",
	});

	const subscription = subscriptions.data[0];
	if (!subscription) {
		return { status: "none", plan: "FREE" };
	}

	const priceId = subscription.items.data[0]?.price.id;
	if (!priceId) {
		return { status: "none", plan: "FREE" };
	}

	const plan = getPlanFromPriceId(priceId);
	const isTrialActive = subscription.trial_end
		? new Date() < new Date(subscription.trial_end * 1000)
		: false;

	const firstItem = subscription.items.data[0];

	return {
		status: "active",
		subscriptionId: subscription.id,
		subscriptionStatus: subscription.status,
		priceId,
		plan,
		currentPeriodStart: firstItem?.current_period_start ?? 0,
		currentPeriodEnd: firstItem?.current_period_end ?? 0,
		cancelAtPeriodEnd: subscription.cancel_at_period_end,
		cancelAt: subscription.cancel_at,
		trialEnd: subscription.trial_end,
		isTrialActive,
	};
}

export function verifyWebhookSignature(
	payload: string,
	signature: string,
): Stripe.Event {
	const stripe = getStripeClient();
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) {
		throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
	}
	return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
