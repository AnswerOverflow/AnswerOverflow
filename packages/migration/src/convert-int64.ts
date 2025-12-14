import {
	createReadStream,
	createWriteStream,
	renameSync,
	unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const TEMP_DIR = join(process.cwd(), ".migration-temp");

function toInt64(value: string): { $integer: string } {
	return { $integer: value };
}

interface TableConfig {
	file: string;
	int64Fields: string[];
}

const tables: TableConfig[] = [
	{ file: "servers.jsonl", int64Fields: ["discordId"] },
	{ file: "serverPreferences.jsonl", int64Fields: ["serverId"] },
	{
		file: "channels.jsonl",
		int64Fields: [
			"discordId",
			"serverId",
			"parentId",
			"archivedTimestamp",
			"solutionTagId",
			"lastIndexedSnowflake",
		],
	},
	{ file: "channelSettings.jsonl", int64Fields: ["channelId"] },
	{ file: "discordAccounts.jsonl", int64Fields: ["id"] },
	{
		file: "messages.jsonl",
		int64Fields: [
			"id",
			"authorId",
			"serverId",
			"channelId",
			"parentChannelId",
			"childThreadId",
			"questionId",
			"referenceId",
			"applicationId",
			"interactionId",
			"webhookId",
		],
	},
	{ file: "emojis.jsonl", int64Fields: ["id"] },
	{ file: "reactions.jsonl", int64Fields: ["messageId", "userId", "emojiId"] },
	{
		file: "userServerSettings.jsonl",
		int64Fields: ["discordAccountId", "serverId"],
	},
	{ file: "ignoredDiscordAccounts.jsonl", int64Fields: ["id"] },
];

async function convertFile(config: TableConfig): Promise<void> {
	const inputPath = join(TEMP_DIR, config.file);
	const outputPath = join(TEMP_DIR, `${config.file}.new`);

	console.log(`Converting ${config.file}...`);

	const input = createReadStream(inputPath);
	const output = createWriteStream(outputPath);
	const rl = createInterface({ input, crlfDelay: Infinity });

	let count = 0;
	const startTime = Date.now();

	for await (const line of rl) {
		if (!line.trim()) continue;

		const obj = JSON.parse(line);

		for (const field of config.int64Fields) {
			if (obj[field] !== undefined && obj[field] !== null) {
				obj[field] = toInt64(String(obj[field]));
			}
		}

		output.write(`${JSON.stringify(obj)}\n`);
		count++;

		if (count % 1000000 === 0) {
			const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
			console.log(
				`  ${config.file}: ${count.toLocaleString()} rows - ${elapsed}s`,
			);
		}
	}

	await new Promise<void>((resolve, reject) => {
		output.end(() => resolve());
		output.on("error", reject);
	});

	unlinkSync(inputPath);
	renameSync(outputPath, inputPath);

	const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
	console.log(
		`  ✓ ${config.file}: ${count.toLocaleString()} rows converted in ${elapsed}s`,
	);
}

async function main() {
	console.log("Converting string IDs to int64 format...\n");

	for (const config of tables) {
		await convertFile(config);
	}

	console.log("\n✓ All files converted!");
}

main().catch((error) => {
	console.error("Conversion failed:", error);
	process.exit(1);
});
