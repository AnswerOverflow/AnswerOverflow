import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { dbMessages } from "./db/schema";
import { transformMessage } from "./transformers/message";
import { ProgressLogger } from "./utils/progress";

const TEMP_DIR = join(process.cwd(), ".migration-temp");
const BATCH_SIZE = 5000;

const LAST_ID = "1162770728400208032";
const ALREADY_PROCESSED = 11333078;

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

async function resumeMessages() {
	const total = await getCount("Message");
	const remaining = total - ALREADY_PROCESSED;
	console.log(`\nResuming messages migration...`);
	console.log(`  Total: ${total.toLocaleString()}`);
	console.log(`  Already processed: ${ALREADY_PROCESSED.toLocaleString()}`);
	console.log(`  Remaining: ${remaining.toLocaleString()}`);
	console.log(`  Starting from ID: ${LAST_ID}\n`);

	const stream = createWriteStream(join(TEMP_DIR, "messages.jsonl"), {
		encoding: "utf8",
		flags: "a",
	});

	const progress = new ProgressLogger("messages", total, ALREADY_PROCESSED);

	let lastId = LAST_ID;
	let count = 0;

	while (true) {
		const rows = await getDb()
			.select()
			.from(dbMessages)
			.where(sql`${dbMessages.id} > ${lastId}`)
			.orderBy(dbMessages.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			const transformed = transformMessage(row);
			const cleaned = stripUndefined(transformed);
			stream.write(`${JSON.stringify(cleaned)}\n`);
			progress.increment();
			count++;
		}

		lastId = rows[rows.length - 1]?.id;
	}

	await new Promise<void>((resolve, reject) => {
		stream.end(() => resolve());
		stream.on("error", reject);
	});

	progress.done();
	console.log(`\nAppended ${count.toLocaleString()} messages`);
	console.log(
		`Total messages now: ${(ALREADY_PROCESSED + count).toLocaleString()}`,
	);
}

resumeMessages().catch((error) => {
	console.error("Resume failed:", error);
	process.exit(1);
});
