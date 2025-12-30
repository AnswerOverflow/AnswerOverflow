"use client";

import { api } from "@packages/database/convex/_generated/api";
import { useAuthenticatedQuery } from "../../../../../../lib/use-authenticated-query";

type Plan =
	| "FREE"
	| "STARTER"
	| "ADVANCED"
	| "PRO"
	| "ENTERPRISE"
	| "OPEN_SOURCE";

export function TierAccessOnly({
	children,
	enabledFor,
	serverId,
}: {
	children: (enabled: boolean) => React.ReactElement;
	enabledFor: Plan[];
	serverId: string;
}) {
	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	if (!dashboardData) {
		return <div className="opacity-50">{children(false)}</div>;
	}

	const currentPlan = dashboardData.server.plan;
	const isPaidPlan = currentPlan !== "FREE";
	const enabled = enabledFor.includes("FREE")
		? enabledFor.includes(currentPlan)
		: isPaidPlan;

	if (enabled) {
		return <>{children(true)}</>;
	}

	return (
		<div className="grid grid-cols-1 grid-rows-1">
			<div className="cursor-not-allowed opacity-50">{children(false)}</div>
			<div className="flex flex-row items-center justify-between space-y-2 rounded-b-lg border bg-muted/20 p-3 sm:space-y-0 sm:px-10">
				<span>You must be on the paid platform for this feature.</span>
				{/* TODO: Add PricingDialog when Stripe integration is added */}
			</div>
		</div>
	);
}
