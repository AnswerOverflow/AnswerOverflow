import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { Array as Arr, Option } from "effect";
import type { CommunityServer } from "./discord-server-types";

type CommunityServerRow = {
	id: string;
	name: string;
	icon: string | null;
	member_count: number | null;
	invite: string | null;
	description: string | null;
};

const getDbPath = (): string | null => {
	const candidatePaths = [
		path.resolve(process.cwd(), "scripts", "community-servers.db"),
		path.resolve(process.cwd(), "..", "..", "scripts", "community-servers.db"),
	];
	const dbPathOption = Arr.findFirst(candidatePaths, (candidate) =>
		fs.existsSync(candidate),
	);
	return Option.getOrElse(dbPathOption, () => null);
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
	const dbPath = getDbPath();
	if (!dbPath) {
		return [];
	}
	const db = new Database(dbPath, { readonly: true, fileMustExist: true });
	const rows = db
		.prepare<[], CommunityServerRow>(
			"SELECT id, name, icon, member_count, invite, description FROM community_servers ORDER BY member_count DESC NULLS LAST",
		)
		.all();
	db.close();

	return Arr.map(rows, rowToServer);
}

export const searchCommunityServers = (
	query: string,
	limit = 20,
): CommunityServer[] => {
	const dbPath = getDbPath();
	if (!dbPath) {
		return [];
	}

	const db = new Database(dbPath, { readonly: true, fileMustExist: true });

	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		const rows = db
			.prepare<[number], CommunityServerRow>(
				"SELECT id, name, icon, member_count, invite, description FROM community_servers ORDER BY member_count DESC NULLS LAST LIMIT ?",
			)
			.all(limit);
		db.close();
		return Arr.map(rows, rowToServer);
	}

	const rows = db
		.prepare<[string, number], CommunityServerRow>(
			`SELECT id, name, icon, member_count, invite, description 
       FROM community_servers 
       WHERE name LIKE '%' || ? || '%' COLLATE NOCASE
       ORDER BY member_count DESC NULLS LAST 
       LIMIT ?`,
		)
		.all(trimmedQuery, limit);
	db.close();

	return Arr.map(rows, rowToServer);
};
