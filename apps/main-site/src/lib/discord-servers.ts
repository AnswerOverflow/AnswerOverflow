import "server-only";

import { Database } from "@packages/database/database";
import { Array as Arr, Effect } from "effect";
import { unstable_cache } from "next/cache";
import type { DiscordServerContext } from "./discord-server-types";
import { runtime } from "./runtime";

async function fetchFeaturedServersInternal(): Promise<DiscordServerContext[]> {
	return Effect.gen(function* () {
		const database = yield* Database;
		const convexServers =
			yield* database.public.servers.getCachedBrowsableServers({});

		return Arr.map(convexServers ?? [], (server) => ({
			discordId: server.discordId.toString(),
			name: server.name,
			hasBot: true,
			iconUrl: server.icon
				? `https://cdn.discordapp.com/icons/${server.discordId.toString()}/${server.icon}.png`
				: undefined,
			description: server.description ?? undefined,
			memberCount: server.approximateMemberCount,
		}));
	}).pipe(runtime.runPromise);
}

export const getFeaturedServers = unstable_cache(
	fetchFeaturedServersInternal,
	["featured-servers"],
	{
		revalidate: 60 * 60,
	},
);
