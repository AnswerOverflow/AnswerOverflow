import { Database } from "@packages/database/database";
import { Array as Arr, Effect, Order, pipe } from "effect";
import { NextResponse, type NextRequest } from "next/server";
import { searchCommunityServers } from "@/lib/community-servers";
import type { DiscordServerContext } from "@/lib/discord-server-types";
import { runtime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const query = searchParams.get("q") ?? "";
	const limitParam = searchParams.get("limit");
	const limit = limitParam ? parseInt(limitParam, 10) : 20;

	const servers = await Effect.gen(function* () {
		const database = yield* Database;
		const convexServers =
			yield* database.public.servers.getCachedBrowsableServers({});
		const communityServers = searchCommunityServers(query, limit * 2);

		const convexServerContexts: DiscordServerContext[] = Arr.map(
			convexServers ?? [],
			(server) => ({
				discordId: server.discordId.toString(),
				name: server.name,
				hasBot: true,
				iconUrl: server.icon
					? `https://cdn.discordapp.com/icons/${server.discordId.toString()}/${server.icon}.png`
					: undefined,
				description: server.description ?? undefined,
				memberCount: server.approximateMemberCount,
			}),
		);

		const filteredConvexServers = query.trim()
			? Arr.filter(convexServerContexts, (server) =>
					server.name.toLowerCase().includes(query.toLowerCase()),
				)
			: convexServerContexts;

		const convexServerIds = new Set(
			filteredConvexServers.map((s) => s.discordId),
		);

		const communityServerContexts: DiscordServerContext[] = pipe(
			communityServers,
			Arr.filter((server) => !convexServerIds.has(server.id)),
			Arr.map((server) => ({
				discordId: server.id,
				name: server.name,
				invite: server.invite,
				hasBot: false,
				iconUrl: server.iconUrl,
				memberCount: server.memberCount,
				description: server.description,
			})),
		);

		const allServers = [...filteredConvexServers, ...communityServerContexts];

		return pipe(
			allServers,
			Arr.sortBy(
				Order.reverse(
					Order.mapInput(
						Order.number,
						(s: DiscordServerContext) => s.memberCount ?? 0,
					),
				),
			),
			Arr.take(limit),
		);
	}).pipe(runtime.runPromise);

	return NextResponse.json({ servers });
}
