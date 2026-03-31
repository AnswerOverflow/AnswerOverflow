import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(scriptDir, "../../../scripts/community-servers.db");
const outputPath = resolve(
	scriptDir,
	"../src/generated/community-servers.generated.ts",
);

const db = new Database(dbPath, { readonly: true, fileMustExist: true });
const rows = db
	.prepare(
		"SELECT id, name, icon, member_count, invite, description FROM community_servers ORDER BY member_count DESC NULLS LAST",
	)
	.all();
db.close();

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
	outputPath,
	`export const communityServers = ${JSON.stringify(rows, null, "\t")};\n`,
);
