import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect } from "effect";
import { HomePageClient } from "./client";

export default async function HomePage() {
	// Get featured servers (biggest servers)
	const featuredServersData = await Effect.gen(function* () {
		const database = yield* Database;
		const serversLiveData = yield* Effect.scoped(
			database.servers.getBiggestServers(10),
		);
		return serversLiveData?.data ?? [];
	})
		.pipe(Effect.provide(DatabaseLayer))
		.pipe(Effect.runPromise);

	return <HomePageClient featuredServers={featuredServersData} />;
}
