import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect } from "effect";
import { ServerGrid } from "./client";

export default async function BrowsePage() {
	const serversLiveData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* Effect.scoped(
			database.servers.publicGetAllServers(),
		);
		return liveData;
	})
		.pipe(Effect.provide(DatabaseLayer))
		.pipe(Effect.runPromise);

	const servers = serversLiveData.data ?? [];

	return (
		<div>
			Browse
			<ServerGrid servers={servers} />
		</div>
	);
}
