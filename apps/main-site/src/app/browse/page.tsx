import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect } from "effect";
import { ServerGrid } from "./client";

export default async function BrowsePage() {
	const servers = await Effect.gen(function* () {
		const database = yield* Database;
		const servers = yield* database.servers.publicGetAllServers();
		return servers;
	})
		.pipe(Effect.provide(DatabaseLayer))
		.pipe(Effect.runPromise);
	return (
		<div>
			Browse
			<ServerGrid servers={servers} />
		</div>
	);
}
