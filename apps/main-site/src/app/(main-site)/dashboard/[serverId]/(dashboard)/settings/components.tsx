"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Spinner } from "@packages/ui/components/spinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAction } from "convex/react";
import dayjs from "dayjs";
import { CreditCard } from "lucide-react";
import { useQueryState } from "nuqs";
import { useAuthenticatedQuery } from "../../../../../../lib/use-authenticated-query";

type Plan =
	| "FREE"
	| "STARTER"
	| "ADVANCED"
	| "PRO"
	| "ENTERPRISE"
	| "OPEN_SOURCE";

function planToPrettyText(plan: Plan): string {
	switch (plan) {
		case "FREE":
			return "Free";
		case "ADVANCED":
			return "Advanced";
		default:
			return "Advanced";
	}
}

function SubscriptionStatus(props: { serverId: bigint }) {
	const getSubscriptionInfo = useAction(
		api.authenticated.stripe.getSubscriptionInfo,
	);

	const { data, isLoading } = useQuery({
		queryKey: ["subscription-info", props.serverId.toString()],
		queryFn: () => getSubscriptionInfo({ serverId: props.serverId }),
	});

	if (isLoading) {
		return (
			<div className="text-muted-foreground text-sm flex items-center gap-2">
				<Spinner className="h-3 w-3" /> Loading subscription info...
			</div>
		);
	}

	if (!data || data.status === "inactive") {
		return null;
	}

	const { isTrialActive, trialEnd, currentPeriodEnd, cancelAtPeriodEnd } = data;

	if (isTrialActive && trialEnd) {
		return (
			<p className="text-muted-foreground text-sm">
				Trial ends {dayjs(trialEnd * 1000).format("MMM DD, YYYY")}
			</p>
		);
	}

	if (cancelAtPeriodEnd) {
		return (
			<p className="text-muted-foreground text-sm">
				Cancels {dayjs(currentPeriodEnd * 1000).format("MMM DD, YYYY")}
			</p>
		);
	}

	return (
		<p className="text-muted-foreground text-sm">
			Renews {dayjs(currentPeriodEnd * 1000).format("MMM DD, YYYY")}
		</p>
	);
}

function UpgradeButton(props: { serverId: bigint }) {
	const createCheckoutSession = useAction(
		api.authenticated.stripe.createCheckoutSession,
	);

	const handleUpgrade = async () => {
		const result = await createCheckoutSession({
			serverId: props.serverId,
			plan: "ADVANCED",
			successUrl: `${window.location.origin}/dashboard/${props.serverId}/settings?success=true`,
			cancelUrl: `${window.location.origin}/dashboard/${props.serverId}/settings?canceled=true`,
		});

		if (result.url) {
			window.location.href = result.url;
		}
	};

	return (
		<Button onClick={handleUpgrade} className="gap-2">
			Upgrade to Advanced
		</Button>
	);
}

function ManageBillingButton(props: { serverId: bigint }) {
	const createBillingPortalSession = useAction(
		api.authenticated.stripe.createBillingPortalSession,
	);

	const handleManageBilling = async () => {
		const result = await createBillingPortalSession({
			serverId: props.serverId,
			returnUrl: `${window.location.origin}/dashboard/${props.serverId}/settings`,
		});

		window.location.href = result.url;
	};

	return (
		<Button variant="outline" onClick={handleManageBilling} className="gap-2">
			<CreditCard className="h-4 w-4" />
			Manage Billing
		</Button>
	);
}

function useSyncAfterCheckout(serverId: string) {
	const [success, setSuccess] = useQueryState("success");
	const queryClient = useQueryClient();
	const syncAfterCheckout = useAction(
		api.authenticated.stripe.syncAfterCheckout,
	);

	const hasSuccess = success === "true";

	const { isLoading: isSyncing, isSuccess: syncSuccess } = useQuery({
		queryKey: ["sync-after-checkout", serverId],
		queryFn: async () => {
			const result = await syncAfterCheckout({ serverId: BigInt(serverId) });
			queryClient.invalidateQueries({
				queryKey: ["subscription-info", serverId],
			});
			await setSuccess(null);
			return result;
		},
		enabled: hasSuccess,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

	return { isSyncing, syncSuccess };
}

export function CurrentPlanCard({ serverId }: { serverId: string }) {
	const _syncStatus = useSyncAfterCheckout(serverId);

	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	const getSubscriptionInfo = useAction(
		api.authenticated.stripe.getSubscriptionInfo,
	);

	const { data: subscriptionData } = useQuery({
		queryKey: ["subscription-info", serverId],
		queryFn: () => getSubscriptionInfo({ serverId: BigInt(serverId) }),
		enabled: !!dashboardData,
	});

	if (!dashboardData) {
		return (
			<Card className="h-full w-full">
				<CardHeader>
					<CardTitle>Current plan</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground">Loading...</div>
				</CardContent>
			</Card>
		);
	}

	const { plan } = dashboardData.server;
	const serverIdBigInt = BigInt(serverId);
	const isPaidPlan = plan !== "FREE";
	const hasActiveSubscription =
		subscriptionData?.status === "active" ||
		(subscriptionData?.status === "inactive" &&
			subscriptionData.hasSubscribedBefore);

	return (
		<Card className="h-full w-full">
			<CardHeader>
				<CardTitle>Current plan</CardTitle>
				<CardDescription>
					Manage your subscription and billing settings
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				<span className="text-2xl font-semibold">{planToPrettyText(plan)}</span>
				<SubscriptionStatus serverId={serverIdBigInt} />
			</CardContent>
			<CardFooter className="flex flex-wrap gap-2">
				{!isPaidPlan && <UpgradeButton serverId={serverIdBigInt} />}
				{(isPaidPlan || hasActiveSubscription) && (
					<ManageBillingButton serverId={serverIdBigInt} />
				)}
			</CardFooter>
		</Card>
	);
}
