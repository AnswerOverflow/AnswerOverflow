import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { dbAttachments } from "./db/schema";
import { transformAttachment } from "./transformers/attachment";
import { ProgressLogger } from "./utils/progress";
import { buildConvexZip, type TableExport } from "./writers/zip-builder";

const TEMP_DIR = join(process.cwd(), ".migration-temp");
const OUTPUT_FILE = join(process.cwd(), "attachments-export.zip");
const BATCH_SIZE = 10000;

const isTestMode = process.argv.includes("--test");

function log(msg: string) {
	console.log(`  [${new Date().toISOString()}] ${msg}`);
}

function stripUndefined(obj: object): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) {
			result[key] = value;
		}
	}
	return result;
}

async function getCount(tableName: string): Promise<number> {
	const result = await getDb().execute(
		sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`),
	);
	const rows = result.rows;
	if (rows.length === 0) return 0;
	const row = rows[0];
	if (row && typeof row === "object" && "count" in row) {
		return Number(row.count);
	}
	return 0;
}

async function migrateAttachments(): Promise<TableExport> {
	log("Getting total count...");
	const total = await getCount("Attachment");
	console.log(`\nMigrating attachments (${total.toLocaleString()} rows)...`);

	if (isTestMode) {
		console.log("  [TEST MODE] Only migrating first 100 rows\n");
	}

	if (!existsSync(TEMP_DIR)) {
		mkdirSync(TEMP_DIR, { recursive: true });
	}

	const outputPath = join(TEMP_DIR, "attachments.jsonl");
	writeFileSync(outputPath, "");

	const progress = new ProgressLogger("attachments", isTestMode ? 100 : total);

	let lastId = "";
	let count = 0;
	let batchNum = 0;
	const limit = isTestMode ? 100 : Number.POSITIVE_INFINITY;

	while (count < limit) {
		batchNum++;
		const batchLimit = isTestMode
			? Math.min(BATCH_SIZE, limit - count)
			: BATCH_SIZE;

		log(`Fetching batch ${batchNum} (lastId: ${lastId || "start"})...`);
		const rows = await getDb()
			.select()
			.from(dbAttachments)
			.where(sql`${dbAttachments.id} > ${lastId}`)
			.limit(batchLimit);

		log(`Batch ${batchNum}: got ${rows.length} rows`);

		if (rows.length === 0) {
			log("No more rows, exiting loop");
			break;
		}

		const lines: string[] = [];
		for (const row of rows) {
			const transformed = transformAttachment(row);
			lines.push(JSON.stringify(stripUndefined(transformed)));
			progress.increment();
			count++;

			if (count >= limit) break;
		}

		log(`Writing ${lines.length} lines to file...`);
		appendFileSync(outputPath, `${lines.join("\n")}\n`);
		log(`Batch ${batchNum} written to disk`);

		const lastRow = rows[rows.length - 1];
		if (lastRow) {
			lastId = lastRow.id;
		}
	}

	log("Migration loop complete");
	progress.done();

	return {
		tableName: "attachments",
		documentsPath: outputPath,
		recordCount: count,
	};
}

async function main() {
	console.log("Attachment Migration Script");
	console.log("===========================\n");

	if (isTestMode) {
		console.log("Running in TEST MODE (--test flag detected)");
		console.log("Only 100 rows will be migrated for verification.\n");
	}

	const startTime = Date.now();

	const exportData = await migrateAttachments();

	log("Building ZIP file...");
	await buildConvexZip(OUTPUT_FILE, [exportData]);

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(`\n✓ Migration complete in ${elapsed} seconds`);
	console.log(
		`  Total attachments: ${exportData.recordCount.toLocaleString()}`,
	);
	console.log(`\nNext steps:`);
	console.log(`  1. Review the export: unzip -l ${OUTPUT_FILE}`);
	console.log(
		`  2. Import to Convex: bunx convex import --prod --append ${OUTPUT_FILE}`,
	);
	console.log(
		`     (Use --append to add to existing data without replacing other tables)`,
	);
}

main().catch((error) => {
	console.error("Migration failed:", error);
	process.exit(1);
});
