import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { Effect } from "effect";
import type { Metadata } from "next";
import { Suspense } from "react";
import { runtime } from "../../lib/runtime";
import {
	buildSearchQueryString,
	hasNonEmptySearchParam,
} from "../../lib/search-params";
import { HomePageClient, HomePageSkeleton } from "./client";

type SearchParams = {
	cursor?: string | string[];
	q?: string | string[];
};

type Props = {
	searchParams: Promise<SearchParams>;
};

async function fetchRecentThreads(cursor: string | null) {
	// "use cache";

	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.search.getRecentThreads({
			paginationOpts: {
				numItems: 20,
				cursor,
			},
		});
	}).pipe(runtime.runPromise);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const searchParams = await props.searchParams;
	const cursorParam = Array.isArray(searchParams.cursor)
		? searchParams.cursor[0]
		: searchParams.cursor;
	const hasQuery = hasNonEmptySearchParam(searchParams.q);
	const canonicalPath = hasQuery
		? "/"
		: `/${buildSearchQueryString({ cursor: cursorParam })}`;

	return {
		title: "Recent Threads | Answer Overflow",
		description:
			"Live feed of Discord threads as they come in. Browse recently indexed conversations on Answer Overflow.",
		alternates: {
			canonical: canonicalPath,
		},
		robots: hasQuery ? "noindex, follow" : "index, follow",
	};
}

async function HomePageLoader({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const params = await searchParams;
	const cursorParam = Array.isArray(params.cursor)
		? params.cursor[0]
		: params.cursor;
	const cursor = cursorParam ? decodeCursor(cursorParam) : null;

	const initialData = await fetchRecentThreads(cursor);

	return (
		<HomePageClient
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={cursor}
		/>
	);
}

export default async function HomePage(props: Props) {
	return (
		<Suspense fallback={<HomePageSkeleton />}>
			<HomePageLoader searchParams={props.searchParams} />
		</Suspense>
	);
}
