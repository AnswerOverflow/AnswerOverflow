import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { runtime } from "../lib/runtime";
import { HomePageClient } from "./client";

export default async function HomePage() {
	const initialData = await Effect.gen(function* () {
		const database = yield* Database;
		const result = yield* database.public.search.getRecentThreads({
			paginationOpts: {
				numItems: 20,
				cursor: null,
			},
		});
		return result;
	}).pipe(runtime.runPromise);

	return <HomePageClient initialThreads={initialData.page} />;
}
