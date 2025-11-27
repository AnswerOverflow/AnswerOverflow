"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Card, CardContent } from "@packages/ui/components/card";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import { DiscordMessage } from "@packages/ui/components/discord-message";
import { Input } from "@packages/ui/components/input";
import { Link } from "@packages/ui/components/link";
import { Skeleton } from "@packages/ui/components/skeleton";

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

	const hasQuery =
		debouncedSearchQuery && debouncedSearchQuery.trim().length > 0;

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

				{hasQuery ? (
					<ConvexInfiniteList
						query={api.public.search.publicSearch}
						queryArgs={{ query: debouncedSearchQuery }}
						pageSize={10}
						loader={
							<div className="py-4">
								<div className="flex justify-center">
									<Skeleton className="h-32 w-full max-w-2xl" />
								</div>
							</div>
						}
						renderItem={(result) => (
							<div
								key={result.message.message.id}
								className="relative group hover:opacity-90 transition-opacity mb-4"
							>
								<Link
									href={`/m/${result.message.message.id}`}
									className="absolute inset-0 z-0"
									aria-label="Open message"
								/>
								<div className="relative z-10 pointer-events-none [&_a]:pointer-events-auto">
									<DiscordMessage enrichedMessage={result.message} />
								</div>
							</div>
						)}
					/>
				) : (
					<Card>
						<CardContent className="pt-6">
							<p className="text-muted-foreground text-center py-8">
								{debouncedSearchQuery && debouncedSearchQuery.trim().length > 0
									? `No results found for "${debouncedSearchQuery}"`
									: "Enter a search query to find messages"}
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
