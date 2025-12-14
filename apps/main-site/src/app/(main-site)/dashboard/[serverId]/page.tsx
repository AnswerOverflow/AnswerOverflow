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
import { DiscordAvatar } from "@packages/ui/components/discord-avatar";
import { Link } from "@packages/ui/components/link";
import { Spinner } from "@packages/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@packages/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { useAuthenticatedQuery } from "../../../../lib/use-authenticated-query";

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

function PageViewsChart(props: { serverId: bigint; dateRange?: DateRange }) {
	const getPageViews = useAction(
		api.authenticated.dashboard.getPageViewsForServer,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: [
			"page-views",
			props.serverId.toString(),
			props.dateRange?.from?.getTime(),
			props.dateRange?.to?.getTime(),
		],
		queryFn: () =>
			getPageViews({
				serverId: props.serverId,
				from: props.dateRange?.from?.getTime(),
				to: props.dateRange?.to?.getTime(),
			}),
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

function QuestionsAndAnswersChart(props: {
	serverId: bigint;
	dateRange?: DateRange;
}) {
	const getQuestionsAndAnswers = useAction(
		api.authenticated.dashboard.getQuestionsAndAnswers,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: [
			"questions-and-answers",
			props.serverId.toString(),
			props.dateRange?.from?.getTime(),
			props.dateRange?.to?.getTime(),
		],
		queryFn: () =>
			getQuestionsAndAnswers({
				serverId: props.serverId,
				from: props.dateRange?.from?.getTime(),
				to: props.dateRange?.to?.getTime(),
			}),
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

function TopQuestionSolversTable(props: { serverId: bigint }) {
	const getTopQuestionSolvers = useAction(
		api.authenticated.dashboard.getTopQuestionSolversForServer,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["top-question-solvers", props.serverId.toString()],
		queryFn: () => getTopQuestionSolvers({ serverId: props.serverId }),
	});

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Top Question Solvers</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-40 items-center justify-center">
						<Spinner />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Top Question Solvers</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground flex h-40 items-center justify-center px-6">
						Sorry we encountered an error loading the data.
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!data || Object.keys(data).length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Top Question Solvers</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground flex h-40 items-center justify-center">
						No data available yet
					</div>
				</CardContent>
			</Card>
		);
	}

	const sortedEntries = Object.entries(
		data as Record<
			string,
			{ aggregated_value: number; name: string; avatar: string | null }
		>,
	)
		.map(([solverId, solverData]) => ({
			solverId,
			count: solverData.aggregated_value,
			name: solverData.name,
			avatar: solverData.avatar,
		}))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Top Question Solvers</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="max-w-[200px]">User</TableHead>
							<TableHead className="text-right">Solutions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedEntries.map((entry) => (
							<TableRow key={entry.solverId}>
								<TableCell className="max-w-[200px]">
									<Link
										href={`/u/${entry.solverId}`}
										className="flex items-center gap-2 hover:underline"
									>
										<DiscordAvatar
											user={{
												id: entry.solverId,
												name: entry.name,
												avatar: entry.avatar ?? undefined,
											}}
											size={24}
										/>
										<span className="truncate">{entry.name}</span>
									</Link>
								</TableCell>
								<TableCell className="text-right">
									{entry.count.toLocaleString()}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function TopPagesTable(props: { serverId: bigint }) {
	const getTopPages = useAction(
		api.authenticated.dashboard.getTopPagesForServer,
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["top-pages", props.serverId.toString()],
		queryFn: () => getTopPages({ serverId: props.serverId }),
	});

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Popular Pages</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-40 items-center justify-center">
						<Spinner />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Popular Pages</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground flex h-40 items-center justify-center px-6">
						Sorry we encountered an error loading the data.
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!data || Object.keys(data).length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Popular Pages</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-muted-foreground flex h-40 items-center justify-center">
						No data available yet
					</div>
				</CardContent>
			</Card>
		);
	}

	const sortedEntries = Object.entries(data)
		.map(([messageId, chartData]) => ({
			messageId,
			views: chartData.aggregated_value,
			name: chartData.name,
		}))
		.sort((a, b) => b.views - a.views)
		.slice(0, 10);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Popular Pages</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="max-w-[300px]">Title</TableHead>
							<TableHead className="text-right">Views</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedEntries.map((entry) => (
							<TableRow key={entry.messageId}>
								<TableCell className="max-w-[300px]">
									<Link
										href={`/m/${entry.messageId}`}
										target="_blank"
										className="block truncate text-blue-500 hover:underline"
									>
										{entry.name}
									</Link>
								</TableCell>
								<TableCell className="text-right">
									{entry.views.toLocaleString()}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
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
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold">{server.name}</h1>
					<p className="text-muted-foreground mt-2">
						Dashboard overview and analytics
					</p>
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<PageViewsChart serverId={serverIdBigInt} />
				<ServerInvitesChart serverId={serverIdBigInt} />
				<QuestionsAndAnswersChart serverId={serverIdBigInt} />
				<TopQuestionSolversTable serverId={serverIdBigInt} />
				<TopPagesTable serverId={serverIdBigInt} />
			</div>
		</div>
	);
}
