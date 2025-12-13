"use client";

import { api } from "@packages/database/convex/_generated/api";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import {
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { encodeCursor } from "@packages/ui/utils/cursor";
import type { FunctionReturnType } from "convex/server";

type RecentThreadsResult = FunctionReturnType<
	typeof api.public.search.getRecentThreads
>;

export function HomePageSkeleton() {
	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Recent Threads
					</h1>
					<p className="text-muted-foreground">
						Live feed of Discord threads as they come in
					</p>
				</div>
				<div className="space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<ThreadCardSkeleton key={`skeleton-${i}`} />
					))}
				</div>
			</div>
		</div>
	);
}

export function HomePageClient({
	initialData,
	nextCursor,
	currentCursor,
}: {
	initialData?: RecentThreadsResult;
	nextCursor?: string | null;
	currentCursor?: string | null;
}) {
	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Recent Threads
					</h1>
					<p className="text-muted-foreground">
						Live feed of Discord threads as they come in
					</p>
				</div>

				<ConvexInfiniteList
					query={api.public.search.getRecentThreads}
					queryArgs={{}}
					pageSize={20}
					initialLoaderCount={5}
					loader={<ThreadCardSkeleton />}
					initialData={initialData}
					initialCursor={currentCursor}
					emptyState={
						<div className="text-center py-12 text-muted-foreground">
							No threads found
						</div>
					}
					renderItem={(result) => (
						<ThreadCard
							key={result.message.message.id.toString()}
							result={result}
						/>
					)}
				/>
				{nextCursor && (
					<a
						href={`?cursor=${encodeCursor(nextCursor)}`}
						className="sr-only"
						aria-hidden="true"
					>
						Next page
					</a>
				)}
			</div>
		</div>
	);
}
