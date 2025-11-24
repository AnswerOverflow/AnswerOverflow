import { Database } from "@packages/database/database";
import { Effect } from "effect";
import type { Metadata } from "next";
import { runtime } from "../../lib/runtime";
import { ServerGrid } from "./client";

export const metadata: Metadata = {
	title: "Browse All Communities - Answer Overflow",
	description:
		"Browse all of the communities on Answer Overflow. Find the best Discord servers to join and learn about the communities that are out there.",
	openGraph: {
		title: "Browse All Communities - Answer Overflow",
		description:
			"Browse all of the communities on Answer Overflow. Find the best Discord servers to join and learn about the communities that are out there.",
	},
};

export default async function BrowsePage() {
	const serversLiveData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.servers.getBrowseServers();
		return liveData;
	}).pipe(runtime.runPromise);

	const servers = serversLiveData ?? [];

	return (
		<>
			<h1 className="text-xl md:text-xl py-2">Browse Communities</h1>
			<ServerGrid servers={servers} />
		</>
	);
}
