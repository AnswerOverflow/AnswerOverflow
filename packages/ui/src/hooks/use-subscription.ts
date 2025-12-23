"use client";

import { api } from "@packages/database/convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";

type SubscriptionInfo =
	| {
			status: "active";
			subscriptionId: string;
			subscriptionStatus: string;
			cancelAt: number | null;
			currentPeriodEnd: number;
			trialEnd: number | null;
			isTrialActive: boolean;
			cancelAtPeriodEnd: boolean;
	  }
	| {
			status: "inactive";
			hasSubscribedBefore: boolean;
	  };

type CheckoutSessionResult = {
	url: string | null;
	sessionId: string;
	hasSubscribedInPast: boolean;
};

type BillingPortalResult = {
	url: string;
};

export function useSubscription(serverId: bigint) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const createCheckoutSessionAction = useAction(
		api.authenticated.stripe.createCheckoutSession,
	);
	const createBillingPortalSessionAction = useAction(
		api.authenticated.stripe.createBillingPortalSession,
	);
	const getSubscriptionInfoAction = useAction(
		api.authenticated.stripe.getSubscriptionInfo,
	);

	const startCheckout = useCallback(
		async (
			successUrl: string,
			cancelUrl: string,
		): Promise<CheckoutSessionResult | null> => {
			setIsLoading(true);
			setError(null);
			try {
				const result = await createCheckoutSessionAction({
					serverId,
					plan: "ADVANCED",
					successUrl,
					cancelUrl,
				});
				return result;
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to start checkout",
				);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[createCheckoutSessionAction, serverId],
	);

	const openBillingPortal = useCallback(
		async (returnUrl: string): Promise<BillingPortalResult | null> => {
			setIsLoading(true);
			setError(null);
			try {
				const result = await createBillingPortalSessionAction({
					serverId,
					returnUrl,
				});
				return result;
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to open billing portal",
				);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[createBillingPortalSessionAction, serverId],
	);

	const fetchSubscriptionInfo =
		useCallback(async (): Promise<SubscriptionInfo | null> => {
			setIsLoading(true);
			setError(null);
			try {
				const result = await getSubscriptionInfoAction({
					serverId,
				});
				return result;
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to fetch subscription info",
				);
				return null;
			} finally {
				setIsLoading(false);
			}
		}, [getSubscriptionInfoAction, serverId]);

	return {
		isLoading,
		error,
		startCheckout,
		openBillingPortal,
		fetchSubscriptionInfo,
	};
}
