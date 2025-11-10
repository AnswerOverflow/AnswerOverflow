import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect } from "effect";
import { SearchPageClient } from "./client";

type Props = {
	searchParams: Promise<{ q?: string; s?: string; c?: string }>;
};

export default async function SearchPage(props: Props) {
	const searchParams = await props.searchParams;
	const query = searchParams.q;
	const serverId = searchParams.s;
	const channelId = searchParams.c;

	// If no query, just show empty state
	if (!query || !query.trim()) {
		return <SearchPageClient query={undefined} results={[]} />;
	}

	// Search messages using Convex search
	const searchResults = await Effect.gen(function* () {
		const database = yield* Database;
		const resultsLiveData = yield* Effect.scoped(
			database.messages.searchMessages({
				query: query.trim(),
				serverId: serverId as any, // Will be validated in query
				channelId: channelId,
				limit: 20,
			}),
		);
		return resultsLiveData?.data ?? [];
	})
		.pipe(Effect.provide(DatabaseLayer))
		.pipe(Effect.runPromise);

	return <SearchPageClient query={query} results={searchResults} />;
}
