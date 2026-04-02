"use client";

import { api } from "@packages/database/convex/_generated/api";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@packages/ui/components/empty";
import { SearchInput } from "@packages/ui/components/search-input";
import { SnapshotInfiniteList } from "@packages/ui/components/snapshot-infinite-list";
import {
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { encodeCursor } from "@packages/ui/utils/cursor";
import { useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { FileQuestion } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback } from "react";
import { useDebounce } from "use-debounce";
import { CrawlablePaginationNav } from "../../components/crawlable-pagination-nav";

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
					<SearchInput
						value=""
						onChange={() => {}}
						placeholder="Search threads..."
						className="mt-4"
					/>
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
	const [searchQuery, setSearchQuery] = useQueryState("q", {
		defaultValue: "",
	});
	const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
	const convex = useConvex();
	const hasQuery = debouncedSearchQuery.trim().length > 0;
	const isSearching =
		searchQuery !== debouncedSearchQuery && searchQuery.trim().length > 0;
	const loadSearchPage = useCallback(
		({ cursor, numItems }: { cursor: string | null; numItems: number }) =>
			convex.query(api.public.search.publicSearch, {
				query: debouncedSearchQuery,
				paginationOpts: {
					numItems,
					cursor,
				},
			}),
		[convex, debouncedSearchQuery],
	);
	const loadRecentThreadsPage = useCallback(
		({ cursor, numItems }: { cursor: string | null; numItems: number }) =>
			convex.query(api.public.search.getRecentThreads, {
				paginationOpts: {
					numItems,
					cursor,
				},
			}),
		[convex],
	);

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
					<SearchInput
						value={searchQuery}
						onChange={(value) => setSearchQuery(value || null)}
						placeholder="Search threads..."
						isSearching={isSearching}
						className="mt-4"
					/>
				</div>

				{hasQuery ? (
					<SnapshotInfiniteList
						loadPage={loadSearchPage}
						pageSize={20}
						initialLoaderCount={5}
						loader={<ThreadCardSkeleton />}
						emptyState={
							<Empty className="py-16">
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<FileQuestion />
									</EmptyMedia>
									<EmptyTitle>No results found</EmptyTitle>
									<EmptyDescription>
										No messages match your search for "{debouncedSearchQuery}".
										Try different keywords or check your spelling.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						}
						renderItem={(result) => (
							<ThreadCard
								key={result.message.message.id.toString()}
								result={result}
							/>
						)}
					/>
				) : (
					<>
						<SnapshotInfiniteList
							loadPage={loadRecentThreadsPage}
							pageSize={20}
							initialLoaderCount={5}
							loader={<ThreadCardSkeleton />}
							initialData={initialData}
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
						<CrawlablePaginationNav
							firstPageHref={currentCursor ? "/" : undefined}
							nextPageHref={
								nextCursor ? `?cursor=${encodeCursor(nextCursor)}` : undefined
							}
						/>
					</>
				)}
			</div>
		</div>
	);
}
