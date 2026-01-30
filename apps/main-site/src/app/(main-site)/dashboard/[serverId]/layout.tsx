import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { runtime } from "@/lib/runtime";

export async function generateStaticParams() {
	const servers = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.servers.getBrowseServers({});
	}).pipe(runtime.runPromise);

	return servers.slice(0, 3).map((server) => ({
		serverId: server.discordId.toString(),
	}));
}

export default function ServerIdLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
