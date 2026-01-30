import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { cacheLife, cacheTag } from "next/cache";
import { runtime } from "../../../lib/runtime";
import { DashboardClient } from "./client";

async function fetchRecentThreads() {
	"use cache";
	cacheLife("minutes");
	cacheTag("dashboard-recent-threads");

	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.search.getRecentThreads({
			paginationOpts: {
				numItems: 10,
				cursor: null,
			},
		});
	}).pipe(runtime.runPromise);
}

export default async function DashboardPage() {
	const threads = await fetchRecentThreads();
	const initialThreads = threads.page;

	return <DashboardClient initialThreads={initialThreads} />;
}
