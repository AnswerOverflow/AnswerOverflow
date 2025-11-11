"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

export default function DashboardOverviewPage() {
	const params = useParams();
	const serverId = params.serverId as Id<"servers">;

	const dashboardData = useQuery(api.dashboard_queries.getDashboardData, {
		serverId,
	});

	if (!dashboardData) {
		return <div className="text-muted-foreground">Loading dashboard...</div>;
	}

	const { server } = dashboardData;

	return (
		<div className="w-full max-w-[1200px]">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">{server.name}</h1>
				<p className="text-muted-foreground mt-2">
					Dashboard overview and analytics
				</p>
			</div>

			{/* TODO: Add analytics dashboard components here */}
			<Card>
				<CardHeader>
					<CardTitle>Analytics Dashboard</CardTitle>
					<CardDescription>
						Analytics charts and insights will be displayed here.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground">
						Analytics dashboard coming soon. This will include:
						<ul className="list-disc list-inside mt-2 space-y-1">
							<li>Page views over time</li>
							<li>Popular pages</li>
							<li>Questions and answers</li>
							<li>Top question solvers</li>
							<li>Server invite clicks</li>
						</ul>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
