import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { getDb } from "./db/client";
import {
	dbChannels,
	dbDiscordAccounts,
	dbEmojis,
	dbIgnoredDiscordAccounts,
	dbMessages,
	dbReactions,
	dbServers,
	dbUserServerSettings,
} from "./db/schema";
import { transformChannel } from "./transformers/channel";
import { transformDiscordAccount } from "./transformers/discord-account";
import { transformEmoji } from "./transformers/emoji";
import { transformIgnoredDiscordAccount } from "./transformers/ignored-discord-account";
import { transformMessage } from "./transformers/message";
import { transformReaction } from "./transformers/reaction";
import { transformServer } from "./transformers/server";
import { transformUserServerSettings } from "./transformers/user-server-settings";
import { ProgressLogger } from "./utils/progress";
import { JsonlWriter } from "./writers/jsonl-writer";
import {
	buildConvexZip,
	cleanupTempFiles,
	type TableExport,
} from "./writers/zip-builder";

const TEMP_DIR = join(process.cwd(), ".migration-temp");
const OUTPUT_FILE = join(process.cwd(), "migration-export.zip");

let BATCH_SIZE = 5000;
let MAX_ROWS: number | null = null;

function shouldStop(processed: number): boolean {
	return MAX_ROWS !== null && processed >= MAX_ROWS;
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

async function migrateServers(): Promise<TableExport[]> {
	const total = await getCount("Server");
	console.log(`\nMigrating servers (${total.toLocaleString()} rows)...`);

	const serverWriter = new JsonlWriter(join(TEMP_DIR, "servers.jsonl"));
	const serverPrefsWriter = new JsonlWriter(
		join(TEMP_DIR, "serverPreferences.jsonl"),
	);
	const progress = new ProgressLogger("servers", total);

	let lastId = "0";
	while (true) {
		const rows = await getDb()
			.select()
			.from(dbServers)
			.where(sql`${dbServers.id} > ${lastId}`)
			.orderBy(dbServers.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			const { server, serverPreferences } = transformServer(row);
			serverWriter.write(server);
			serverPrefsWriter.write(serverPreferences);
			progress.increment();
		}

		lastId = rows[rows.length - 1]?.id;
		if (shouldStop(progress.getProcessed())) break;
	}

	await serverWriter.close();
	await serverPrefsWriter.close();
	progress.done();

	return [
		{
			tableName: "servers",
			documentsPath: join(TEMP_DIR, "servers.jsonl"),
			recordCount: serverWriter.getCount(),
		},
		{
			tableName: "serverPreferences",
			documentsPath: join(TEMP_DIR, "serverPreferences.jsonl"),
			recordCount: serverPrefsWriter.getCount(),
		},
	];
}

async function migrateChannels(): Promise<TableExport[]> {
	const total = await getCount("Channel");
	console.log(`\nMigrating channels (${total.toLocaleString()} rows)...`);

	const channelWriter = new JsonlWriter(join(TEMP_DIR, "channels.jsonl"));
	const channelSettingsWriter = new JsonlWriter(
		join(TEMP_DIR, "channelSettings.jsonl"),
	);
	const progress = new ProgressLogger("channels", total);

	let lastId = "0";
	while (true) {
		const rows = await getDb()
			.select()
			.from(dbChannels)
			.where(sql`${dbChannels.id} > ${lastId}`)
			.orderBy(dbChannels.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			const { channel, channelSettings } = transformChannel(row);
			channelWriter.write(channel);
			channelSettingsWriter.write(channelSettings);
			progress.increment();
		}

		lastId = rows[rows.length - 1]?.id;
		if (shouldStop(progress.getProcessed())) break;
	}

	await channelWriter.close();
	await channelSettingsWriter.close();
	progress.done();

	return [
		{
			tableName: "channels",
			documentsPath: join(TEMP_DIR, "channels.jsonl"),
			recordCount: channelWriter.getCount(),
		},
		{
			tableName: "channelSettings",
			documentsPath: join(TEMP_DIR, "channelSettings.jsonl"),
			recordCount: channelSettingsWriter.getCount(),
		},
	];
}

async function migrateDiscordAccounts(): Promise<TableExport[]> {
	const total = await getCount("DiscordAccount");
	console.log(
		`\nMigrating discord accounts (${total.toLocaleString()} rows)...`,
	);

	const writer = new JsonlWriter(join(TEMP_DIR, "discordAccounts.jsonl"));
	const progress = new ProgressLogger("discordAccounts", total);

	let lastId = "0";
	while (true) {
		const rows = await getDb()
			.select()
			.from(dbDiscordAccounts)
			.where(sql`${dbDiscordAccounts.id} > ${lastId}`)
			.orderBy(dbDiscordAccounts.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			writer.write(transformDiscordAccount(row));
			progress.increment();
		}

		lastId = rows[rows.length - 1]?.id;
		if (shouldStop(progress.getProcessed())) break;
	}

	await writer.close();
	progress.done();

	return [
		{
			tableName: "discordAccounts",
			documentsPath: join(TEMP_DIR, "discordAccounts.jsonl"),
			recordCount: writer.getCount(),
		},
	];
}

async function migrateMessages(): Promise<TableExport[]> {
	const total = await getCount("Message");
	console.log(`\nMigrating messages (${total.toLocaleString()} rows)...`);

	const writer = new JsonlWriter(join(TEMP_DIR, "messages.jsonl"));
	const progress = new ProgressLogger("messages", total);

	let lastId = "0";
	while (true) {
		const rows = await getDb()
			.select()
			.from(dbMessages)
			.where(sql`${dbMessages.id} > ${lastId}`)
			.orderBy(dbMessages.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			writer.write(transformMessage(row));
			progress.increment();
		}

		lastId = rows[rows.length - 1]?.id;
		if (shouldStop(progress.getProcessed())) break;
	}

	await writer.close();
	progress.done();

	return [
		{
			tableName: "messages",
			documentsPath: join(TEMP_DIR, "messages.jsonl"),
			recordCount: writer.getCount(),
		},
	];
}

async function migrateEmojis(): Promise<TableExport[]> {
	const total = await getCount("Emoji");
	console.log(`\nMigrating emojis (${total.toLocaleString()} rows)...`);

	const writer = new JsonlWriter(join(TEMP_DIR, "emojis.jsonl"));
	const progress = new ProgressLogger("emojis", total);

	let lastId = "0";
	while (true) {
		const rows = await getDb()
			.select()
			.from(dbEmojis)
			.where(sql`${dbEmojis.id} > ${lastId}`)
			.orderBy(dbEmojis.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			writer.write(transformEmoji(row));
			progress.increment();
		}

		lastId = rows[rows.length - 1]?.id;
		if (shouldStop(progress.getProcessed())) break;
	}

	await writer.close();
	progress.done();

	return [
		{
			tableName: "emojis",
			documentsPath: join(TEMP_DIR, "emojis.jsonl"),
			recordCount: writer.getCount(),
		},
	];
}

async function migrateReactions(): Promise<TableExport[]> {
	const total = await getCount("Reaction");
	console.log(`\nMigrating reactions (${total.toLocaleString()} rows)...`);

	const writer = new JsonlWriter(join(TEMP_DIR, "reactions.jsonl"));
	const progress = new ProgressLogger("reactions", total);

	let lastMessageId = "0";
	let lastUserId = "0";
	let lastEmojiId = "0";

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
			writer.write(transformReaction(row));
			progress.increment();
		}

		const lastRow = rows[rows.length - 1]!;
		lastMessageId = lastRow.messageId;
		lastUserId = lastRow.userId;
		lastEmojiId = lastRow.emojiId;
		if (shouldStop(progress.getProcessed())) break;
	}

	await writer.close();
	progress.done();

	return [
		{
			tableName: "reactions",
			documentsPath: join(TEMP_DIR, "reactions.jsonl"),
			recordCount: writer.getCount(),
		},
	];
}

async function migrateUserServerSettings(): Promise<TableExport[]> {
	const total = await getCount("UserServerSettings");
	console.log(
		`\nMigrating user server settings (${total.toLocaleString()} rows)...`,
	);

	const writer = new JsonlWriter(join(TEMP_DIR, "userServerSettings.jsonl"));
	const progress = new ProgressLogger("userServerSettings", total);

	let lastUserId = "0";
	let lastServerId = "0";

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
			writer.write(transformUserServerSettings(row));
			progress.increment();
		}

		const lastRow = rows[rows.length - 1]!;
		lastUserId = lastRow.userId;
		lastServerId = lastRow.serverId;
		if (shouldStop(progress.getProcessed())) break;
	}

	await writer.close();
	progress.done();

	return [
		{
			tableName: "userServerSettings",
			documentsPath: join(TEMP_DIR, "userServerSettings.jsonl"),
			recordCount: writer.getCount(),
		},
	];
}

async function migrateIgnoredDiscordAccounts(): Promise<TableExport[]> {
	const total = await getCount("IgnoredDiscordAccount");
	console.log(
		`\nMigrating ignored discord accounts (${total.toLocaleString()} rows)...`,
	);

	const writer = new JsonlWriter(
		join(TEMP_DIR, "ignoredDiscordAccounts.jsonl"),
	);
	const progress = new ProgressLogger("ignoredDiscordAccounts", total);

	let lastId = "0";
	while (true) {
		const rows = await getDb()
			.select()
			.from(dbIgnoredDiscordAccounts)
			.where(sql`${dbIgnoredDiscordAccounts.id} > ${lastId}`)
			.orderBy(dbIgnoredDiscordAccounts.id)
			.limit(BATCH_SIZE);

		if (rows.length === 0) break;

		for (const row of rows) {
			writer.write(transformIgnoredDiscordAccount(row));
			progress.increment();
		}

		lastId = rows[rows.length - 1]?.id;
		if (shouldStop(progress.getProcessed())) break;
	}

	await writer.close();
	progress.done();

	return [
		{
			tableName: "ignoredDiscordAccounts",
			documentsPath: join(TEMP_DIR, "ignoredDiscordAccounts.jsonl"),
			recordCount: writer.getCount(),
		},
	];
}

interface MigrationOptions {
	testMode?: boolean;
}

export async function runMigration(
	options: MigrationOptions = {},
): Promise<void> {
	if (options.testMode) {
		BATCH_SIZE = 100;
		MAX_ROWS = 100;
		console.log("TEST MODE: Only migrating 100 rows per table\n");
	}
	console.log("Starting migration from PlanetScale to Convex...\n");
	const startTime = Date.now();

	await mkdir(TEMP_DIR, { recursive: true });

	const allExports: TableExport[] = [];

	try {
		allExports.push(...(await migrateServers()));
		allExports.push(...(await migrateChannels()));
		allExports.push(...(await migrateDiscordAccounts()));
		allExports.push(...(await migrateMessages()));
		allExports.push(...(await migrateEmojis()));
		allExports.push(...(await migrateReactions()));
		allExports.push(...(await migrateUserServerSettings()));
		allExports.push(...(await migrateIgnoredDiscordAccounts()));

		console.log("\nBuilding ZIP file...");
		await buildConvexZip(OUTPUT_FILE, allExports);

		console.log("\nCleaning up temp files...");
		cleanupTempFiles(allExports);

		const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
		console.log(`\n✓ Migration complete in ${elapsed} minutes`);
		console.log(`\nNext steps:`);
		console.log(`  1. Review the export: unzip -l ${OUTPUT_FILE}`);
		console.log(
			`  2. Import to Convex: bunx convex import --prod --replace ${OUTPUT_FILE}`,
		);
	} catch (error) {
		console.error("\n✗ Migration failed:", error);
		cleanupTempFiles(allExports);
		throw error;
	}
}
