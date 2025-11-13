import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { HomePageClient } from "./client";

const OtelLayer = createOtelLayer("main-site");

export default async function HomePage() {
	// Get featured servers (biggest servers)
	const featuredServersData = await Effect.gen(function* () {
		const database = yield* Database;
		const serversLiveData = yield* Effect.scoped(
			database.servers.getBiggestServers(10),
		);
		return serversLiveData?.data ?? [];
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	return <HomePageClient featuredServers={featuredServersData} />;
}
