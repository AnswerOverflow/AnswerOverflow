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
import { useTenant } from "@packages/ui/components/tenant-context";
import {
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { FileQuestion, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { Suspense } from "react";
import { useDebounce } from "use-debounce";

function TenantSearchResults({
	query,
	serverId,
}: {
	query: string;
	serverId: string;
}) {
	return (
		<ConvexInfiniteList
			query={api.public.search.publicSearch}
			queryArgs={{ query, serverId }}
			pageSize={10}
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
							No messages match your search for "{query}". Try different
							keywords or check your spelling.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			}
			renderItem={(result) => (
				<ThreadCard
					key={result.message.message.id}
					result={result}
					hideServer
				/>
			)}
		/>
	);
}

function TenantSearchPageContent() {
	const tenant = useTenant();
	const [searchQuery, setSearchQuery] = useQueryState("q", {
		defaultValue: "",
	});
	const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

	const hasQuery =
		debouncedSearchQuery && debouncedSearchQuery.trim().length > 0;
	const isSearching =
		searchQuery !== debouncedSearchQuery && searchQuery.trim().length > 0;

	const serverName = tenant?.name ?? "this community";

	return (
		<div className="min-h-screen bg-background">
			<div className="border-b border-border bg-muted/30">
				<div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
					<h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
						Search {serverName}
					</h1>
					<p className="text-muted-foreground text-sm sm:text-base mb-6">
						Find answers from community discussions
					</p>
					<SearchInput
						value={searchQuery ?? ""}
						onChange={(value) => setSearchQuery(value || null)}
						placeholder={`Search ${serverName}...`}
						isSearching={isSearching}
						autoFocus
						className="max-w-xl"
					/>
				</div>
			</div>

			<div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
				{hasQuery && tenant?.discordId ? (
					<div className="space-y-4">
						<TenantSearchResults
							query={debouncedSearchQuery}
							serverId={tenant.discordId.toString()}
						/>
					</div>
				) : (
					<Empty className="py-16 border border-dashed rounded-xl bg-muted/10">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Search />
							</EmptyMedia>
							<EmptyTitle>Start searching</EmptyTitle>
							<EmptyDescription>
								Enter a search query above to find answers from {serverName}.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</div>
		</div>
	);
}

export default function TenantSearchPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-background">
					<div className="border-b border-border bg-muted/30">
						<div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
							<h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
								Search
							</h1>
							<p className="text-muted-foreground text-sm sm:text-base mb-6">
								Find answers from community discussions
							</p>
							<SearchInput
								value=""
								onChange={() => {}}
								placeholder="Search..."
								isSearching={false}
								autoFocus
								className="max-w-xl"
							/>
						</div>
					</div>
				</div>
			}
		>
			<TenantSearchPageContent />
		</Suspense>
	);
}
