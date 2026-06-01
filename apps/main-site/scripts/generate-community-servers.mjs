// Use Bun's built-in SQLite so this install-time script has no native addon to
// compile, avoiding NODE_MODULE_VERSION ABI mismatches in CI. Run with `bun`.
import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(scriptDir, "../../../scripts/community-servers.db");
const outputPath = resolve(
	scriptDir,
	"../src/generated/community-servers.generated.ts",
);

const db = new Database(dbPath, { readonly: true });
const rows = db
	.query(
		"SELECT id, name, icon, member_count, invite, description FROM community_servers ORDER BY member_count DESC NULLS LAST",
	)
	.all();
db.close();

mkdirSync(dirname(outputPath), { recursive: true });
// Emit the rows via JSON.parse rather than an inline object-array literal. A
// literal this large makes TypeScript infer a union over every row and fail
// with TS2590 ("union type that is too complex to represent"); JSON.parse
// returns `any`, so the array just takes the declared CommunityServerRow[] type.
const header = `export type CommunityServerRow = {
	id: string;
	name: string;
	icon: string | null;
	member_count: number | null;
	invite: string | null;
	description: string | null;
};

`;
const json = JSON.stringify(rows);
writeFileSync(
	outputPath,
	`${header}export const communityServers: CommunityServerRow[] = JSON.parse(\n\t${JSON.stringify(json)},\n);\n`,
);
