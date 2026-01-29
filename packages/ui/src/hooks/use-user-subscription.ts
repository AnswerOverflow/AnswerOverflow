"use client";

import { api } from "@packages/database/convex/_generated/api";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { useAction, useQuery } from "convex/react";
import { useCallback, useState } from "react";

export function useUserSubscription() {
	const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
	const [isPortalLoading, setIsPortalLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const session = useSession({ allowAnonymous: true });
	const isAuthenticated = !!session?.data && !session.data.user.isAnonymous;

	const subscription = useQuery(
		api.authenticated.user_subscription.getUserSubscription,
		isAuthenticated ? {} : "skip",
	);

	const usageStatus = useQuery(
		api.chat.usage.getMessageUsageStatus,
		isAuthenticated ? {} : "skip",
	);

	const createCheckoutSessionAction = useAction(
		api.authenticated.user_subscription_actions.createCheckoutSession,
	);
	const createBillingPortalSessionAction = useAction(
		api.authenticated.user_subscription_actions.createBillingPortalSession,
	);
	const cancelSubscriptionAction = useAction(
		api.authenticated.user_subscription_actions.cancelSubscription,
	);
	const reactivateSubscriptionAction = useAction(
		api.authenticated.user_subscription_actions.reactivateSubscription,
	);
	const syncAfterCheckoutAction = useAction(
		api.authenticated.user_subscription_actions.syncAfterCheckout,
	);

	const startCheckout = useCallback(async () => {
		setIsCheckoutLoading(true);
		setError(null);
		try {
			const result = await createCheckoutSessionAction({});
			if (result?.url) {
				window.location.href = result.url;
			}
			return result;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to start checkout");
			return null;
		} finally {
			setIsCheckoutLoading(false);
		}
	}, [createCheckoutSessionAction]);

	const openBillingPortal = useCallback(async () => {
		setIsPortalLoading(true);
		setError(null);
		try {
			const result = await createBillingPortalSessionAction({});
			if (result?.url) {
				window.location.href = result.url;
			}
			return result;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to open billing portal",
			);
			return null;
		} finally {
			setIsPortalLoading(false);
		}
	}, [createBillingPortalSessionAction]);

	const cancelSubscription = useCallback(
		async (immediately = false) => {
			setError(null);
			try {
				await cancelSubscriptionAction({ immediately });
				return true;
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to cancel subscription",
				);
				return false;
			}
		},
		[cancelSubscriptionAction],
	);

	const reactivateSubscription = useCallback(async () => {
		setError(null);
		try {
			await reactivateSubscriptionAction({});
			return true;
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to reactivate subscription",
			);
			return false;
		}
	}, [reactivateSubscriptionAction]);

	const syncAfterCheckout = useCallback(async () => {
		if (!isAuthenticated) return null;
		try {
			return await syncAfterCheckoutAction({});
		} catch (err) {
			console.error("Failed to sync after checkout:", err);
			return null;
		}
	}, [syncAfterCheckoutAction, isAuthenticated]);

	const isPro = subscription?.plan === "PRO";
	const isLoading = subscription === undefined || usageStatus === undefined;

	const messagesRemaining = usageStatus
		? Math.max(
				0,
				usageStatus.subscriptionMessagesLimit -
					usageStatus.subscriptionMessagesUsed,
			) + usageStatus.purchasedCredits
		: 0;

	const usagePercentage = usageStatus
		? (usageStatus.subscriptionMessagesUsed /
				usageStatus.subscriptionMessagesLimit) *
			100
		: 0;

	return {
		subscription,
		usageStatus,
		isPro,
		isLoading,
		isCheckoutLoading,
		isPortalLoading,
		error,
		messagesRemaining,
		usagePercentage,
		startCheckout,
		openBillingPortal,
		cancelSubscription,
		reactivateSubscription,
		syncAfterCheckout,
	};
}
