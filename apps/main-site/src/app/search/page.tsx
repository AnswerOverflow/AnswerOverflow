"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Card, CardContent } from "@packages/ui/components/card";
import { Input } from "@packages/ui/components/input";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useQueryWithStatus } from "@packages/ui/hooks/use-query-with-status";
import { useQueryState } from "nuqs";
import { useDebounce } from "use-debounce";

type Props = {
	searchParams: Promise<{ q?: string; s?: string; c?: string }>;
};

function SearchInput() {
	const [searchQuery, setSearchQuery] = useQueryState("q", {
		defaultValue: "",
	});
	const [debouncedSearchQuery] = useDebounce(searchQuery, 250);
	const { data, status } = useQueryWithStatus(api.public.search.publicSearch, {
		query: debouncedSearchQuery,
	});

	const isLoading = status === "pending";
	const hasQuery =
		debouncedSearchQuery && debouncedSearchQuery.trim().length > 0;
	const hasResults = data && data.length > 0;

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

				{isLoading && hasQuery && (
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

				{!isLoading && hasQuery && !hasResults && (
					<Card>
						<CardContent className="pt-6">
							<p className="text-muted-foreground text-center py-8">
								No results found for &quot;{debouncedSearchQuery}&quot;
							</p>
						</CardContent>
					</Card>
				)}

				{!isLoading && hasResults && (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Found {data.length} result{data.length !== 1 ? "s" : ""}
						</p>
						<div className="space-y-4">
							{data.map((message) => (
								<Card key={message.id}>
									<CardContent className="pt-6">
										<p className="text-foreground whitespace-pre-wrap break-words">
											{message.content}
										</p>
									</CardContent>
								</Card>
							))}
						</div>
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
