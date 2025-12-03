import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "./db/client";
import {
	dbEmojis,
	dbIgnoredDiscordAccounts,
	dbReactions,
	dbUserServerSettings,
} from "./db/schema";
import { transformEmoji } from "./transformers/emoji";
import { transformIgnoredDiscordAccount } from "./transformers/ignored-discord-account";
import { transformReaction } from "./transformers/reaction";
import { transformUserServerSettings } from "./transformers/user-server-settings";
import { ProgressLogger } from "./utils/progress";
import { buildConvexZip, type TableExport } from "./writers/zip-builder";

const TEMP_DIR = join(process.cwd(), ".migration-temp");
const OUTPUT_FILE = join(process.cwd(), "migration-export.zip");
const BATCH_SIZE = 5000;

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

async function migrateEmojis(): Promise<TableExport> {
	const total = await getCount("Emoji");
	console.log(`\nMigrating emojis (${total.toLocaleString()} rows)...`);

	const stream = createWriteStream(join(TEMP_DIR, "emojis.jsonl"), {
		encoding: "utf8",
	});
	const progress = new ProgressLogger("emojis", total);

	let lastId = "0";
	let count = 0;

	while (true) {
		const rows = await getDb()
			.select()
			.from(dbEmojis)
			.where(sql`${dbEmojis.id} > ${lastId}`)
			.orderBy(dbEmojis.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			const transformed = transformEmoji(row);
			stream.write(`${JSON.stringify(stripUndefined(transformed))}\n`);
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
	return {
		tableName: "emojis",
		documentsPath: join(TEMP_DIR, "emojis.jsonl"),
		recordCount: count,
	};
}

async function migrateReactions(): Promise<TableExport> {
	const total = await getCount("Reaction");
	console.log(`\nMigrating reactions (${total.toLocaleString()} rows)...`);

	const stream = createWriteStream(join(TEMP_DIR, "reactions.jsonl"), {
		encoding: "utf8",
	});
	const progress = new ProgressLogger("reactions", total);

	let lastMessageId = "0";
	let lastUserId = "0";
	let lastEmojiId = "0";
	let count = 0;

	while (true) {
		const rows = await getDb()
			.select()
			.from(dbReactions)
			.where(
				sql`(${dbReactions.messageId}, ${dbReactions.userId}, ${dbReactions.emojiId}) > (${lastMessageId}, ${lastUserId}, ${lastEmojiId})`,
			)
			.orderBy(dbReactions.messageId, dbReactions.userId, dbReactions.emojiId)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			const transformed = transformReaction(row);
			stream.write(`${JSON.stringify(stripUndefined(transformed))}\n`);
			progress.increment();
			count++;
		}

		const lastRow = rows[rows.length - 1]!;
		lastMessageId = lastRow.messageId;
		lastUserId = lastRow.userId;
		lastEmojiId = lastRow.emojiId;
	}

	await new Promise<void>((resolve, reject) => {
		stream.end(() => resolve());
		stream.on("error", reject);
	});

	progress.done();
	return {
		tableName: "reactions",
		documentsPath: join(TEMP_DIR, "reactions.jsonl"),
		recordCount: count,
	};
}

async function migrateUserServerSettings(): Promise<TableExport> {
	const total = await getCount("UserServerSettings");
	console.log(
		`\nMigrating user server settings (${total.toLocaleString()} rows)...`,
	);

	const stream = createWriteStream(join(TEMP_DIR, "userServerSettings.jsonl"), {
		encoding: "utf8",
	});
	const progress = new ProgressLogger("userServerSettings", total);

	let lastUserId = "0";
	let lastServerId = "0";
	let count = 0;

	while (true) {
		const rows = await getDb()
			.select()
			.from(dbUserServerSettings)
			.where(
				sql`(${dbUserServerSettings.userId}, ${dbUserServerSettings.serverId}) > (${lastUserId}, ${lastServerId})`,
			)
			.orderBy(dbUserServerSettings.userId, dbUserServerSettings.serverId)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			const transformed = transformUserServerSettings(row);
			stream.write(`${JSON.stringify(stripUndefined(transformed))}\n`);
			progress.increment();
			count++;
		}

		const lastRow = rows[rows.length - 1]!;
		lastUserId = lastRow.userId;
		lastServerId = lastRow.serverId;
	}

	await new Promise<void>((resolve, reject) => {
		stream.end(() => resolve());
		stream.on("error", reject);
	});

	progress.done();
	return {
		tableName: "userServerSettings",
		documentsPath: join(TEMP_DIR, "userServerSettings.jsonl"),
		recordCount: count,
	};
}

async function migrateIgnoredDiscordAccounts(): Promise<TableExport> {
	const total = await getCount("IgnoredDiscordAccount");
	console.log(
		`\nMigrating ignored discord accounts (${total.toLocaleString()} rows)...`,
	);

	const stream = createWriteStream(
		join(TEMP_DIR, "ignoredDiscordAccounts.jsonl"),
		{ encoding: "utf8" },
	);
	const progress = new ProgressLogger("ignoredDiscordAccounts", total);

	let lastId = "0";
	let count = 0;

	while (true) {
		const rows = await getDb()
			.select()
			.from(dbIgnoredDiscordAccounts)
			.where(sql`${dbIgnoredDiscordAccounts.id} > ${lastId}`)
			.orderBy(dbIgnoredDiscordAccounts.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			const transformed = transformIgnoredDiscordAccount(row);
			stream.write(`${JSON.stringify(stripUndefined(transformed))}\n`);
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
	return {
		tableName: "ignoredDiscordAccounts",
		documentsPath: join(TEMP_DIR, "ignoredDiscordAccounts.jsonl"),
		recordCount: count,
	};
}

async function finishMigration() {
	console.log("Finishing migration - remaining tables...\n");
	const startTime = Date.now();

	const allExports: TableExport[] = [
		{
			tableName: "servers",
			documentsPath: join(TEMP_DIR, "servers.jsonl"),
			recordCount: 1533,
		},
		{
			tableName: "serverPreferences",
			documentsPath: join(TEMP_DIR, "serverPreferences.jsonl"),
			recordCount: 1533,
		},
		{
			tableName: "channels",
			documentsPath: join(TEMP_DIR, "channels.jsonl"),
			recordCount: 611527,
		},
		{
			tableName: "channelSettings",
			documentsPath: join(TEMP_DIR, "channelSettings.jsonl"),
			recordCount: 611527,
		},
		{
			tableName: "discordAccounts",
			documentsPath: join(TEMP_DIR, "discordAccounts.jsonl"),
			recordCount: 1390970,
		},
		{
			tableName: "messages",
			documentsPath: join(TEMP_DIR, "messages.jsonl"),
			recordCount: 21949386,
		},
	];

	allExports.push(await migrateEmojis());
	allExports.push(await migrateReactions());
	allExports.push(await migrateUserServerSettings());
	allExports.push(await migrateIgnoredDiscordAccounts());

	console.log("\nBuilding ZIP file...");
	await buildConvexZip(OUTPUT_FILE, allExports);

	const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
	console.log(`\n✓ Migration complete in ${elapsed} minutes`);
	console.log(`\nNext steps:`);
	console.log(`  1. Review the export: unzip -l ${OUTPUT_FILE}`);
	console.log(
		`  2. Import to Convex: bunx convex import --prod --replace ${OUTPUT_FILE}`,
	);
}

finishMigration().catch((error) => {
	console.error("Migration failed:", error);
	process.exit(1);
});
