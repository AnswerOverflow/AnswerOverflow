"use client";

import { api } from "@packages/database/convex/_generated/api";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@packages/ui/components/empty";
import { SearchInput } from "@packages/ui/components/search-input";
import {
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { encodeCursor } from "@packages/ui/utils/cursor";
import type { FunctionReturnType } from "convex/server";
import { FileQuestion } from "lucide-react";
import { useQueryState } from "nuqs";
import { useDebounce } from "use-debounce";

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
	const hasQuery = debouncedSearchQuery.trim().length > 0;
	const isSearching =
		searchQuery !== debouncedSearchQuery && searchQuery.trim().length > 0;

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
					<ConvexInfiniteList
						query={api.public.search.publicSearch}
						queryArgs={{ query: debouncedSearchQuery }}
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
						<ConvexInfiniteList
							query={api.public.search.getRecentThreads}
							queryArgs={{}}
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
						{nextCursor && (
							<a
								href={`?cursor=${encodeCursor(nextCursor)}`}
								className="sr-only"
								aria-hidden="true"
							>
								Next page
							</a>
						)}
					</>
				)}
			</div>
		</div>
	);
}
