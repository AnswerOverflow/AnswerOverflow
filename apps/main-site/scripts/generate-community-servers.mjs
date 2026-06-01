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
writeFileSync(
	outputPath,
	`export const communityServers = ${JSON.stringify(rows, null, "\t")};\n`,
);
