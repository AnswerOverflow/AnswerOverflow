"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Chart } from "@packages/ui/analytics";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Link } from "@packages/ui/components/link";
import { Spinner } from "@packages/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useAuthenticatedQuery } from "../../../lib/use-authenticated-query";

function ChartWrapper(props: {
	label: React.ReactNode;
	chart: React.ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{props.label}</CardTitle>
			</CardHeader>
			<CardContent>{props.chart}</CardContent>
		</Card>
	);
}

function LoadingErrorChart<T>(props: {
	isError: boolean;
	isLoading: boolean;
	data: T | null;
	children: (data: NonNullable<T>) => React.ReactNode;
}) {
	if (props.isError)
		return (
			<div className="text-muted-foreground flex h-80 items-center justify-center px-6">
				Sorry we encountered an error loading the data. We've tracked the error
				and will look into it. If the issue persists, please join the Discord.
			</div>
		);
	if (props.isLoading)
		return (
			<div className="flex h-80 items-center justify-center">
				<Spinner />
			</div>
		);
	if (!props.data) return <div>No data</div>;
	return props.children(props.data);
}

function PageViewsChart(props: { serverId: bigint }) {
	const getPageViews = useAction(
		api.authenticated.dashboard.getPageViewsForServer,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["page-views", props.serverId.toString()],
		queryFn: () => getPageViews({ serverId: props.serverId }),
	});

	const isError = !!error;

	return (
		<ChartWrapper
			label={`Page Views: ${
				!data
					? ""
					: (data.results["Page Views"]?.aggregated_value?.toLocaleString() ??
						"0")
			}`}
			chart={
				<LoadingErrorChart isError={isError} isLoading={isLoading} data={data}>
					{(chartData) => (
						<Chart
							{...chartData}
							showLegend={false}
							valueFormatter={(value) => value.toLocaleString()}
						/>
					)}
				</LoadingErrorChart>
			}
		/>
	);
}

function ServerInvitesChart(props: { serverId: bigint }) {
	const getServerInvites = useAction(
		api.authenticated.dashboard.getServerInvitesClicked,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["server-invites", props.serverId.toString()],
		queryFn: () => getServerInvites({ serverId: props.serverId }),
	});

	const isError = !!error;

	return (
		<ChartWrapper
			label={`Server Invite Clicks: ${
				!data
					? ""
					: (data.results[
							"Invite Clicked"
						]?.aggregated_value?.toLocaleString() ?? "0")
			}`}
			chart={
				<LoadingErrorChart isError={isError} isLoading={isLoading} data={data}>
					{(chartData) => (
						<Chart
							{...chartData}
							showLegend={false}
							valueFormatter={(value) => value.toLocaleString()}
						/>
					)}
				</LoadingErrorChart>
			}
		/>
	);
}

function QuestionsAndAnswersChart(props: { serverId: bigint }) {
	const getQuestionsAndAnswers = useAction(
		api.authenticated.dashboard.getQuestionsAndAnswers,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["questions-and-answers", props.serverId.toString()],
		queryFn: () => getQuestionsAndAnswers({ serverId: props.serverId }),
	});

	const isError = !!error;

	return (
		<ChartWrapper
			label="Questions & Answers"
			chart={
				<LoadingErrorChart isError={isError} isLoading={isLoading} data={data}>
					{(chartData) => <Chart {...chartData} />}
				</LoadingErrorChart>
			}
		/>
	);
}

export default function DashboardOverviewPage() {
	const params = useParams();
	const serverId = params.serverId as string;

	const dashboardData = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getDashboardData,
		{
			serverId: BigInt(serverId),
		},
	);

	if (!dashboardData) {
		return <div className="text-muted-foreground">Loading dashboard...</div>;
	}

	const { server } = dashboardData;
	const serverIdBigInt = BigInt(serverId);

	return (
		<div className="w-full max-w-[1200px]">
			<div className="mb-6 flex items-start justify-between">
				<div>
					<h1 className="text-3xl font-bold">{server.name}</h1>
					<p className="text-muted-foreground mt-2">
						Dashboard overview and analytics
					</p>
				</div>
				<Button asChild variant="outline">
					<Link
						href={`/c/${server.discordId}`}
						target="_blank"
						className="flex items-center gap-2"
					>
						View Community
						<ExternalLink className="h-4 w-4" />
					</Link>
				</Button>
			</div>

			<div className="space-y-6">
				<PageViewsChart serverId={serverIdBigInt} />
				<ServerInvitesChart serverId={serverIdBigInt} />
				<QuestionsAndAnswersChart serverId={serverIdBigInt} />
			</div>
		</div>
	);
}
