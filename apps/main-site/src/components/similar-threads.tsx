"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Link } from "@packages/ui/components/link";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Skeleton } from "@packages/ui/components/skeleton";
import { TimeAgo } from "@packages/ui/components/time-ago";
import { useStableQuery } from "@packages/ui/hooks/use-stable-query";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { CheckCircle2 } from "lucide-react";

type SimilarThreadsProps = {
	searchQuery: string;
	currentThreadId: string;
	currentServerId: string;
	serverId?: string;
};

function SimilarThreadsContainer(props: { children: React.ReactNode }) {
	return (
		<div className="hidden w-full rounded-md border-2 bg-card drop-shadow-md md:block">
			<div className="p-4">
				<h3 className="mb-3 text-sm font-semibold text-muted-foreground">
					Similar Threads
				</h3>
				{props.children}
			</div>
		</div>
	);
}

function SimilarThreadsSkeleton() {
	return (
		<SimilarThreadsContainer>
			<div className="flex flex-col divide-y divide-border">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="py-2.5 first:pt-0 last:pb-0">
						<Skeleton className="mb-1.5 h-4 w-full" />
						<div className="flex items-center gap-2">
							<Skeleton className="size-4 rounded-full" />
							<Skeleton className="h-3 w-32" />
						</div>
					</div>
				))}
			</div>
		</SimilarThreadsContainer>
	);
}

export function SimilarThreads(props: SimilarThreadsProps) {
	const { searchQuery, currentThreadId, currentServerId, serverId } = props;
	const session = useSession({ allowAnonymous: true });

	const results = useStableQuery(
		api.public.search.getSimilarThreads,
		session?.data
			? {
					searchQuery,
					currentThreadId,
					currentServerId,
					serverId,
					limit: 4,
				}
			: "skip",
	);

	if (results === undefined) {
		return <SimilarThreadsSkeleton />;
	}

	if (results.length === 0) {
		return null;
	}

	return (
		<SimilarThreadsContainer>
			<div className="flex flex-col divide-y divide-border">
				{results.map((result) => (
					<Link
						key={result.thread.id}
						href={`/m/${result.thread.id}`}
						className="group block py-2.5 first:pt-0 last:pb-0"
					>
						<div className="flex items-start justify-between gap-2">
							<span className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:underline">
								{result.thread.name}
							</span>
							{result.hasSolution && (
								<CheckCircle2
									size={16}
									className="mt-0.5 shrink-0 text-green-600 dark:text-green-500"
								/>
							)}
						</div>
						<div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
							<ServerIcon
								server={{
									discordId: BigInt(result.server.discordId),
									name: result.server.name,
									icon: result.server.icon,
								}}
								size={14}
								className="shrink-0"
							/>
							<span className="truncate">
								{result.server.name} / {result.channel.name}
							</span>
							<span className="shrink-0 text-muted-foreground/50">·</span>
							<TimeAgo
								snowflake={result.firstMessageId}
								className="shrink-0 text-xs"
							/>
						</div>
					</Link>
				))}
			</div>
		</SimilarThreadsContainer>
	);
}
