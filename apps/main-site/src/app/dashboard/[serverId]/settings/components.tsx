"use client";

import { api } from "@packages/database/convex/_generated/api";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { useAuthenticatedQuery } from "../../../../lib/use-authenticated-query";

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
		case "PRO":
			return "Pro";
		case "OPEN_SOURCE":
			return "Open Source";
		case "ENTERPRISE":
			return "Enterprise";
		case "STARTER":
			return "Starter";
		case "ADVANCED":
			return "Advanced";
		default:
			return plan;
	}
}

export function CurrentPlanCard({ serverId }: { serverId: string }) {
	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

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

	const CTA = () => {
		return null;
	};

	return (
		<Card className="h-full w-full">
			<CardHeader>
				<CardTitle>Current plan</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-1">
				<span className="text-2xl font-semibold">{planToPrettyText(plan)}</span>
				{/* TODO: Add subscription date info when Stripe integration is added */}
			</CardContent>
			<CardFooter>
				<CTA />
			</CardFooter>
		</Card>
	);
}
