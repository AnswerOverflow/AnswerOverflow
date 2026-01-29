"use client";

import { trackEvent, usePostHog } from "@packages/ui/analytics/client";
import { Button } from "@packages/ui/components/button";
import { useUserSubscription } from "@packages/ui/hooks/use-user-subscription";
import { AlertCircle as AlertCircleIcon, LockIcon } from "lucide-react";

function formatTimeUntilReset(resetsAt: number): string {
	const now = Date.now();
	const msRemaining = resetsAt - now;

	if (msRemaining <= 0) return "now";

	const minutes = Math.ceil(msRemaining / 60000);
	if (minutes < 60) {
		return `${minutes} minute${minutes === 1 ? "" : "s"}`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	if (remainingMinutes === 0) {
		return `${hours} hour${hours === 1 ? "" : "s"}`;
	}
	return `${hours}h ${remainingMinutes}m`;
}

export function RateLimitWarning({
	remaining,
	resetsAt,
	isAnonymous,
	onSignIn,
	plan,
}: {
	remaining: number;
	resetsAt: number | null;
	isAnonymous: boolean;
	onSignIn: () => void;
	plan?: "FREE" | "PRO";
}) {
	const { startCheckout, isCheckoutLoading } = useUserSubscription();
	const posthog = usePostHog();

	const showUpgrade = !isAnonymous && plan === "FREE";

	const message =
		remaining === 0
			? `Out of messages.${resetsAt ? ` Resets in ${formatTimeUntilReset(resetsAt)}.` : ""}`
			: `${remaining} message${remaining === 1 ? "" : "s"} remaining.${resetsAt ? ` Resets in ${formatTimeUntilReset(resetsAt)}.` : ""}`;

	const handleCheckoutClick = () => {
		trackEvent(
			"Chat Checkout Started",
			{ plan: "PRO", priceAmount: 500, currentPlan: plan ?? "FREE" },
			posthog,
		);
		startCheckout();
	};

	return (
		<div className="flex items-center gap-2 rounded-t-md border-2 border-b-0 border-border bg-secondary px-3 py-1.5">
			<AlertCircleIcon className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="flex-1 text-xs text-muted-foreground">{message}</span>
			{isAnonymous && (
				<Button
					size="sm"
					variant="ghost"
					className="h-6 shrink-0 px-2 text-xs"
					onClick={onSignIn}
				>
					Sign in for more
				</Button>
			)}
			{showUpgrade && (
				<Button
					size="sm"
					variant="ghost"
					className="h-6 shrink-0 px-2 text-xs"
					onClick={handleCheckoutClick}
					disabled={isCheckoutLoading}
				>
					Get 1,250/mo for $5
				</Button>
			)}
		</div>
	);
}

export function SignInRequiredWarning({
	modelName,
	onSignIn,
}: {
	modelName: string;
	onSignIn: () => void;
}) {
	return (
		<div className="flex items-center gap-2 rounded-t-md border-2 border-b-0 border-border bg-secondary px-3 py-1.5">
			<LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="flex-1 text-xs text-muted-foreground">
				Sign in to use {modelName}
			</span>
			<Button
				size="sm"
				variant="ghost"
				className="h-6 shrink-0 px-2 text-xs"
				onClick={onSignIn}
			>
				Sign in
			</Button>
		</div>
	);
}
