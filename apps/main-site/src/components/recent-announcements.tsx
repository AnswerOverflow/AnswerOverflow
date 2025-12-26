import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";
import { TimeAgo } from "@packages/ui/components/time-ago";
import { makeUserIconLink } from "@packages/ui/utils/discord-avatar";
import type { FunctionReturnType } from "convex/server";
import { Effect, Exit } from "effect";
import { Megaphone } from "lucide-react";
import { runtime } from "@/lib/runtime";

type RecentAnnouncementsProps = {
	serverId: string;
};

type RecentAnnouncementsResult = FunctionReturnType<
	typeof api.public.search.getRecentAnnouncements
>;

export function RecentAnnouncementsSkeleton() {
	return (
		<div className="w-full pt-4 border-t">
			<div className="flex items-center gap-2 mb-3">
				<Megaphone className="size-4 text-muted-foreground" />
				<span className="text-sm font-semibold text-muted-foreground">
					Recent Announcements
				</span>
			</div>
			<div className="flex flex-col gap-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="flex items-start gap-2">
						<Skeleton className="size-5 rounded-full shrink-0" />
						<div className="flex-1 min-w-0">
							<Skeleton className="h-4 w-full mb-1.5" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

async function fetchRecentAnnouncements(
	serverId: string,
): Promise<RecentAnnouncementsResult | null> {
	const exit = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.search.getRecentAnnouncements({
			serverId,
		});
	}).pipe(runtime.runPromiseExit);

	if (Exit.isFailure(exit)) {
		return null;
	}
	return exit.value;
}

function RecentAnnouncementsList(props: {
	results: RecentAnnouncementsResult;
}) {
	const { results } = props;

	if (results.length === 0) {
		return null;
	}

	return (
		<div className="w-full pt-4 border-t">
			<div className="flex items-center gap-2 mb-3">
				<Megaphone className="size-4 text-muted-foreground" />
				<span className="text-sm font-semibold text-muted-foreground">
					Recent Announcements
				</span>
			</div>
			<div className="flex flex-col gap-3">
				{results.map((result) => {
					const thread = result.thread;
					const author = result.message.author;

					return (
						<Link
							key={result.message.message.id.toString()}
							href={`/m/${result.message.message.id.toString()}`}
							className="group flex items-start gap-2"
						>
							{author && (
								<img
									src={makeUserIconLink(
										{
											id: author.id.toString(),
											name: author.name,
											avatar: author.avatar,
										},
										64,
									)}
									alt={author.name}
									className="size-6 shrink-0 rounded-full mt-0.5"
								/>
							)}
							<div className="min-w-0">
								<p className="text-left truncate text-sm font-medium text-foreground group-hover:underline m-0 p-0">
									{(thread?.name ?? result.message.message.content)?.trim()}
								</p>
								<p className="text-xs text-muted-foreground m-0 p-0 text-left">
									{author?.name}
									{author && " · "}
									<TimeAgo
										snowflake={result.message.message.id.toString()}
										className="text-xs"
									/>
								</p>
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
}

export async function RecentAnnouncements(props: RecentAnnouncementsProps) {
	const results = await fetchRecentAnnouncements(props.serverId);

	if (results === null || results.length === 0) {
		return null;
	}

	return <RecentAnnouncementsList results={results} />;
}
