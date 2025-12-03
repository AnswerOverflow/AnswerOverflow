import { join } from "node:path";
import { buildConvexZip, type TableExport } from "./writers/zip-builder";

const TEMP_DIR = join(process.cwd(), ".migration-temp");
const OUTPUT_FILE = join(process.cwd(), "migration-export.zip");

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
	{
		tableName: "emojis",
		documentsPath: join(TEMP_DIR, "emojis.jsonl"),
		recordCount: 138,
	},
	{
		tableName: "reactions",
		documentsPath: join(TEMP_DIR, "reactions.jsonl"),
		recordCount: 236,
	},
	{
		tableName: "userServerSettings",
		documentsPath: join(TEMP_DIR, "userServerSettings.jsonl"),
		recordCount: 954166,
	},
	{
		tableName: "ignoredDiscordAccounts",
		documentsPath: join(TEMP_DIR, "ignoredDiscordAccounts.jsonl"),
		recordCount: 186,
	},
];

async function main() {
	console.log("Building ZIP file...");
	await buildConvexZip(OUTPUT_FILE, allExports);
	console.log("\nReady to import:");
	console.log(`  bunx convex import --prod --replace ${OUTPUT_FILE}`);
}

main().catch((error) => {
	console.error("Failed:", error);
	process.exit(1);
});
