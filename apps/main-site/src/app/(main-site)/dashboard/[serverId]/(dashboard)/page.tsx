"use client";

import { api } from "@packages/database/convex/_generated/api";
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
	ExternalLink,
	FileText,
	MessageSquare,
	MessagesSquare,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
	useAuthenticatedQuery,
	useAuthenticatedQueryWithStatus,
} from "../../../../../lib/use-authenticated-query";
import { getDashboardServerIdFromPathname } from "../server-id-context";

function StatCard(props: {
	icon: React.ReactNode;
	label: string;
	value: number | undefined;
	description?: string;
}) {
	return (
		<div className="flex items-center gap-4 rounded-lg border bg-card p-4">
			<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				{props.icon}
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium text-muted-foreground">
					{props.label}
				</p>
				<p className="text-2xl font-bold tracking-tight">
					{props.value === undefined ? (
						<Spinner />
					) : (
						props.value.toLocaleString()
					)}
				</p>
				{props.description && (
					<p className="text-xs text-muted-foreground">{props.description}</p>
				)}
			</div>
		</div>
	);
}

function IndexedStatsWidget(props: {
	serverId: bigint;
	hasIndexingEnabled: boolean;
}) {
	const stats = useAuthenticatedQuery(
		api.authenticated.dashboard_queries.getIndexedMessageCount,
		{
			serverId: props.serverId,
		},
	);

	return (
		<Card className="col-span-full">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							Indexed Content
						</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="grid gap-4 sm:grid-cols-3">
					<StatCard
						icon={<MessageSquare className="h-6 w-6" />}
						label="Total Messages"
						value={stats?.messages}
						description="Indexed from Discord"
					/>
					<StatCard
						icon={<MessagesSquare className="h-6 w-6" />}
						label="Total Threads"
						value={stats?.threads}
						description="Questions & discussions"
					/>
					<StatCard
						icon={<FileText className="h-6 w-6" />}
						label="Avg. Messages/Thread"
						value={stats?.avgMessagesPerThread}
						description="Thread depth"
					/>
				</div>

				{stats && stats.recentThreads.length > 0 && (
					<div>
						<h4 className="mb-3 text-sm font-semibold text-foreground">
							Recently Indexed
						</h4>
						<div className="space-y-2">
							{stats.recentThreads.map((thread) => (
								<Link
									key={thread.message.id.toString()}
									href={`/m/${thread.message.id}`}
									className="group flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
								>
									{thread.author ? (
										<DiscordAvatar
											user={{
												id: thread.author.id,
												name: thread.author.name,
												avatar: thread.author.avatar ?? undefined,
											}}
											size={32}
										/>
									) : (
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
											<MessagesSquare className="h-4 w-4" />
										</div>
									)}
									<span className="min-w-0 flex-1 truncate text-sm font-medium">
										{thread?.thread?.name ||
											thread.message.content.slice(0, 50)}
									</span>
									<ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
								</Link>
							))}
						</div>
					</div>
				)}

				{stats && stats.recentThreads.length === 0 && (
					<div className="rounded-lg border border-dashed bg-muted/30 px-6 py-8 text-center">
						<MessagesSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
						<p className="mt-3 text-sm font-medium text-muted-foreground">
							No threads indexed yet
						</p>
						<p className="mt-1 max-w-md mx-auto text-xs text-muted-foreground">
							{props.hasIndexingEnabled
								? "Historical threads are being backfilled and will appear in 1-2 days. New threads will appear in real time as they are posted."
								: "Enable indexing on a channel to start indexing threads"}
						</p>
						{!props.hasIndexingEnabled && (
							<Button asChild className="mt-4">
								<Link href={`/dashboard/${props.serverId}/channels`}>
									Setup Indexing
								</Link>
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function DashboardContent({ serverId }: { serverId: bigint }) {
	const {
		data: dashboardData,
		error,
		isSessionPending,
		isAuthenticated,
	} = useAuthenticatedQueryWithStatus(
		api.authenticated.dashboard_queries.getDashboardData,
		{ serverId },
	);

	if (isSessionPending) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner /> Authenticating...
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="text-muted-foreground">
				Please sign in to access the dashboard.
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-destructive">
				Failed to load dashboard: {error.message}
			</div>
		);
	}

	if (!dashboardData) {
		return (
			<div className="flex items-center gap-2 text-muted-foreground">
				<Spinner /> Loading dashboard...
			</div>
		);
	}

	const { server, channels } = dashboardData;
	const hasIndexingEnabled = channels.some((c) => c.flags.indexingEnabled);

	return (
		<div className="w-full max-w-[1200px]">
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold">{server.name}</h1>
					<p className="text-muted-foreground mt-2">Dashboard overview</p>
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

			<div className="grid gap-6 lg:grid-cols-2">
				<IndexedStatsWidget
					serverId={serverId}
					hasIndexingEnabled={hasIndexingEnabled}
				/>
			</div>
		</div>
	);
}

export default function DashboardOverviewPage() {
	const pathname = usePathname();
	const serverId = getDashboardServerIdFromPathname(pathname);

	if (!serverId) {
		return <div className="text-muted-foreground">Invalid server ID</div>;
	}

	return <DashboardContent serverId={BigInt(serverId)} />;
}
