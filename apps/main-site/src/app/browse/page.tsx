import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect } from "effect";

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
			{servers.map((server) => (
				<div key={server.discordId}>
					<h2>{server.name}</h2>
					<p>{server.description}</p>
				</div>
			))}
		</div>
	);
}
