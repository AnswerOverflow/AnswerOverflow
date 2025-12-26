import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { DiscordAvatar } from "@packages/ui/components/discord-avatar";
import { Link } from "@packages/ui/components/link";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Skeleton } from "@packages/ui/components/skeleton";
import { TimeAgo } from "@packages/ui/components/time-ago";
import type { FunctionReturnType } from "convex/server";
import { Effect, Exit } from "effect";
import { CheckCircle2 } from "lucide-react";
import { runtime } from "@/lib/runtime";

type SimilarThreadsProps = {
	searchQuery: string;
	currentThreadId: string;
	currentServerId: string;
	serverId?: string;
};

type SimilarThreadsResult = FunctionReturnType<
	typeof api.public.search.getSimilarThreads
>;

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

export function SimilarThreadsSkeleton() {
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

async function fetchSimilarThreads(
	args: SimilarThreadsProps & { limit: number },
): Promise<SimilarThreadsResult | null> {
	const exit = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.search.getSimilarThreads({
			searchQuery: args.searchQuery,
			currentThreadId: args.currentThreadId,
			currentServerId: args.currentServerId,
			serverId: args.serverId,
			limit: args.limit,
		});
	}).pipe(runtime.runPromiseExit);

	if (Exit.isFailure(exit)) {
		return null;
	}
	return exit.value;
}

function SimilarThreadsList(props: {
	results: SimilarThreadsResult;
	isTenantSite: boolean;
}) {
	const { results, isTenantSite } = props;

	if (results.length === 0) {
		return null;
	}

	const resultsWithThreads = results.filter((result) => result.thread != null);

	if (resultsWithThreads.length === 0) {
		return null;
	}

	return (
		<SimilarThreadsContainer>
			<div className="flex flex-col divide-y divide-border">
				{resultsWithThreads.map((result) => {
					const thread = result.thread;
					if (!thread) return null;

					const server = {
						discordId: BigInt(result.server.discordId),
						name: result.server.name,
						icon: result.server.icon,
					};
					const hasSolution = result.message.solutions.length > 0;
					const author = result.message.author;
					return (
						<Link
							key={thread.id}
							href={`/m/${thread.id}`}
							className="group block py-2.5 first:pt-0 last:pb-0"
						>
							<div className="flex items-start justify-between gap-2">
								<span className="truncate text-sm font-medium text-foreground group-hover:underline">
									{thread.name}
								</span>
								{hasSolution && (
									<CheckCircle2
										size={16}
										className="mt-0.5 shrink-0 text-green-600 dark:text-green-500"
									/>
								)}
							</div>
							<div className="mt-1 flex items-center justify-between gap-1.5 text-xs text-muted-foreground">
								<div className="flex min-w-0 items-center gap-1.5">
									{isTenantSite && author ? (
										<>
											<DiscordAvatar
												user={{
													id: author.id.toString(),
													name: author.name,
													avatar: author.avatar,
												}}
												size={16}
												className="shrink-0"
											/>
											<span className="truncate">
												{author.name} / {result.channel.name}
											</span>
										</>
									) : (
										<>
											<ServerIcon
												server={server}
												size={16}
												className="shrink-0"
											/>
											<span className="truncate">
												{result.server.name} / {result.channel.name}
											</span>
										</>
									)}
								</div>
								<TimeAgo
									snowflake={result.message.message.id.toString()}
									className="shrink-0 text-xs"
								/>
							</div>
						</Link>
					);
				})}
			</div>
		</SimilarThreadsContainer>
	);
}

export async function SimilarThreads(props: SimilarThreadsProps) {
	const results = await fetchSimilarThreads({
		...props,
		limit: 4,
	});

	if (results === null) {
		return null;
	}

	const isTenantSite = props.serverId !== undefined;

	return <SimilarThreadsList results={results} isTenantSite={isTenantSite} />;
}
