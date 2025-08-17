import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect } from "effect";
import { ServerCard } from "./client";

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
			<div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{servers.map((server) => {
					return (
						<div
							key={`server-${server.discordId}-area`}
							className="w-full max-w-md rounded-md p-4 transition-all"
						>
							<ServerCard server={server} />
						</div>
					);
				})}
			</div>
		</div>
	);
}
