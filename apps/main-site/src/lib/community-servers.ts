import "server-only";

import { Array as Arr } from "effect";
import { communityServers } from "@/generated/community-servers.generated";
import type { CommunityServer } from "./discord-server-types";

type CommunityServerRow = {
	id: string;
	name: string;
	icon: string | null;
	member_count: number | null;
	invite: string | null;
	description: string | null;
};

const rowToServer = (row: CommunityServerRow): CommunityServer => ({
	id: row.id,
	name: row.name,
	iconUrl: row.icon ?? undefined,
	memberCount: row.member_count ?? undefined,
	invite: row.invite ?? undefined,
	description: row.description ?? undefined,
});

export function getCommunityServers(): CommunityServer[] {
	return Arr.map(communityServers, rowToServer);
}

export const searchCommunityServers = (
	query: string,
	limit = 20,
): CommunityServer[] => {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return Arr.map(communityServers.slice(0, limit), rowToServer);
	}

	return Arr.map(
		communityServers
			.filter((server) =>
				server.name.toLowerCase().includes(trimmedQuery.toLowerCase()),
			)
			.slice(0, limit),
		rowToServer,
	);
};
