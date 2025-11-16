"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Card, CardContent } from "@packages/ui/components/card";
import { DiscordMessage } from "@packages/ui/components/discord-message";
import { Input } from "@packages/ui/components/input";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";

type Props = {
	searchParams: Promise<{ q?: string; s?: string; c?: string }>;
};

function SearchInput() {
	const auth = useConvexAuth();
	const [searchQuery, setSearchQuery] = useQueryState("q", {
		defaultValue: "",
	});
	const [debouncedSearchQuery] = useDebounce(searchQuery, 250);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	const { results, status, loadMore } = usePaginatedQuery(
		api.public.search.publicSearch,
		auth.isAuthenticated &&
			debouncedSearchQuery &&
			debouncedSearchQuery.trim().length > 0
			? { query: debouncedSearchQuery }
			: "skip",
		{ initialNumItems: 10 },
	);

	const isLoadingFirstPage = status === "LoadingFirstPage";
	const isLoadingMore = status === "LoadingMore";
	const hasQuery =
		debouncedSearchQuery && debouncedSearchQuery.trim().length > 0;
	const hasResults = results && results.length > 0;
	const canLoadMore = status === "CanLoadMore";

	useEffect(() => {
		if (!loadMoreRef.current || !canLoadMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && canLoadMore) {
					loadMore(10);
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(loadMoreRef.current);

		return () => {
			observer.disconnect();
		};
	}, [canLoadMore, loadMore]);

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">Search</h1>
					<p className="text-muted-foreground">
						Search through indexed Discord messages
					</p>
				</div>

				<div className="mb-6">
					<Input
						type="search"
						value={searchQuery ?? ""}
						onChange={(e) => setSearchQuery(e.target.value || null)}
						placeholder="Search messages..."
						className="w-full max-w-2xl"
						autoFocus
					/>
				</div>

				{isLoadingFirstPage && hasQuery && (
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<Card key={`skeleton-${i}`}>
								<CardContent className="pt-6">
									<Skeleton className="h-4 w-3/4 mb-2" />
									<Skeleton className="h-4 w-full mb-2" />
									<Skeleton className="h-4 w-5/6" />
								</CardContent>
							</Card>
						))}
					</div>
				)}

				{!isLoadingFirstPage && hasQuery && !hasResults && (
					<Card>
						<CardContent className="pt-6">
							<p className="text-muted-foreground text-center py-8">
								No results found for &quot;{debouncedSearchQuery}&quot;
							</p>
						</CardContent>
					</Card>
				)}

				{hasResults && (
					<div className="space-y-4">
						<div className="space-y-4">
							{results.map((result) => (
								<DiscordMessage
									key={result.message.id}
									message={result.message}
									author={result.author}
									attachments={result.attachments}
									reactions={result.reactions}
									solutions={result.solutions}
								/>
							))}
						</div>
						{canLoadMore && (
							<div ref={loadMoreRef} className="py-4">
								<div className="flex justify-center">
									<Skeleton className="h-32 w-full max-w-2xl" />
								</div>
							</div>
						)}
						{isLoadingMore && (
							<div className="py-4">
								<div className="flex justify-center">
									<Skeleton className="h-32 w-full max-w-2xl" />
								</div>
							</div>
						)}
					</div>
				)}

				{!hasQuery && (
					<Card>
						<CardContent className="pt-6">
							<p className="text-muted-foreground text-center py-8">
								Enter a search query to find messages
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

export default function SearchPage(_props: Props) {
	return <SearchInput />;
}
