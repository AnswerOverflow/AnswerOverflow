import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { Effect } from "effect";
import { Suspense } from "react";
import { runtime } from "../../lib/runtime";
import { HomePageClient, HomePageSkeleton } from "./client";

type Props = {
	searchParams: Promise<{ cursor?: string }>;
};

export const dynamic = "force-dynamic";

async function fetchRecentThreads(cursor: string | null) {
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

async function HomePageLoader({ cursor }: { cursor: string | null }) {
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
	const searchParams = await props.searchParams;
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;

	return (
		<Suspense fallback={<HomePageSkeleton />}>
			<HomePageLoader cursor={cursor} />
		</Suspense>
	);
}
