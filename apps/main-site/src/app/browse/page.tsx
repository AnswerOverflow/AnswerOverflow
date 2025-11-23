import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { ServerGrid } from "./client";

const OtelLayer = createOtelLayer("main-site");

export default async function BrowsePage() {
	const serversLiveData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* Effect.scoped(
			database.private.servers.getAllServers(),
		);
		return liveData;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	const servers = serversLiveData ?? [];

	return (
		<div>
			Browse
			<ServerGrid servers={servers} />
		</div>
	);
}
