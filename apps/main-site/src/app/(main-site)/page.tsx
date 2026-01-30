import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";
import { runtime } from "../../lib/runtime";
import { HomePageClient, HomePageSkeleton } from "./client";

type Props = {
	searchParams: Promise<{ cursor?: string }>;
};

async function fetchRecentThreads(cursor: string | null) {
	"use cache";
	cacheLife("minutes");
	cacheTag("home-recent-threads", cursor ?? "initial");

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

async function HomePageLoader({
	searchParams,
}: {
	searchParams: Promise<{ cursor?: string }>;
}) {
	const params = await searchParams;
	const cursor = params.cursor ? decodeCursor(params.cursor) : null;

	const initialData = await fetchRecentThreads(cursor);

	return (
		<HomePageClient
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
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
