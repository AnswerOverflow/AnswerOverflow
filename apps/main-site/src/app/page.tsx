import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { HomePageClient } from "./client";

const OtelLayer = createOtelLayer("main-site");

export default async function HomePage() {
	const featuredServersData = await Effect.gen(function* () {
		const database = yield* Database;
		const featuredServers = yield* Effect.scoped(
			database.servers.getBiggestServers({ take: 10 }),
		);
		return featuredServers ?? [];
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	return <HomePageClient featuredServers={featuredServersData} />;
}
