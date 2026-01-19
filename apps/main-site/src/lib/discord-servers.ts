import "server-only";

import { Database } from "@packages/database/database";
import { Array as Arr, Effect, pipe } from "effect";
import { getCommunityServers } from "./community-servers";
import type { DiscordServerContext } from "./discord-server-types";
import { runtime } from "./runtime";

export async function getFeaturedServers(): Promise<DiscordServerContext[]> {
	const convexServersPromise = Effect.gen(function* () {
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

	const convexServers = await convexServersPromise;
	const communityServers = getCommunityServers();

	const convexServerIds = new Set(convexServers.map((s) => s.discordId));

	const communityServerContexts: DiscordServerContext[] = pipe(
		communityServers,
		Arr.filter((server) => !convexServerIds.has(server.id)),
		Arr.map((server) => ({
			discordId: server.id,
			name: server.name,
			hasBot: false,
			invite: server.invite,
			iconUrl: server.iconUrl,
			memberCount: server.memberCount,
			description: server.description,
		})),
	);

	const allServers = [...convexServers, ...communityServerContexts];

	return allServers.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
}
