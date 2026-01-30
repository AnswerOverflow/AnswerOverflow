import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";
import { runtime } from "../../lib/runtime";
import { HomePageClient, HomePageSkeleton } from "./client";

async function fetchRecentThreads() {
	"use cache";
	cacheLife("minutes");
	cacheTag("home-recent-threads");

	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.search.getRecentThreads({
			paginationOpts: {
				numItems: 20,
				cursor: null,
			},
		});
	}).pipe(runtime.runPromise);
}

async function HomePageLoader() {
	"use cache";
	cacheLife("minutes");
	cacheTag("home-page-loader");

	const initialData = await fetchRecentThreads();

	return (
		<HomePageClient
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
		/>
	);
}

export default async function HomePage() {
	return (
		<Suspense fallback={<HomePageSkeleton />}>
			<HomePageLoader />
		</Suspense>
	);
}
