#!/usr/bin/env bun

import { parseArgs } from "node:util";
import type {
	CatchupCheckpoint,
	CatchupOptions,
	DatabaseService,
	SyncResult,
} from "./types";

const TABLES = [
	"servers",
	"serverPreferences",
	"channels",
	"channelSettings",
	"discordAccounts",
	"messages",
] as const;

function showHelp(): never {
	console.log(`
Catchup Sync - Incremental sync from PlanetScale to Convex

Usage: bun run catchup [options]

Options:
  --days <number>     Number of days to sync (default: 14)
  --dry-run           Preview what would be synced without making changes (default: true)
  --no-dry-run        Actually perform the sync
  --fresh             Start fresh, ignoring any existing checkpoint
  --table <name>      Sync only a specific table (${TABLES.join(", ")})
  -h, --help          Show this help message

Examples:
  bun run catchup                     # Dry run, past 14 days
  bun run catchup --no-dry-run        # Actually sync, past 14 days
  bun run catchup --days 7            # Dry run, past 7 days
  bun run catchup --table messages    # Dry run, only messages
  bun run catchup --fresh             # Dry run, ignore checkpoint
`);
	process.exit(0);
}

function parseCliArgs(): CatchupOptions {
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			days: { type: "string", default: "14" },
			"dry-run": { type: "boolean", default: true },
			"no-dry-run": { type: "boolean", default: false },
			fresh: { type: "boolean", default: false },
			table: { type: "string" },
			help: { type: "boolean", short: "h", default: false },
		},
	});

	if (values.help) {
		showHelp();
	}

	return {
		daysAgo: Number.parseInt(values.days ?? "14", 10),
		dryRun: values["no-dry-run"] ? false : (values["dry-run"] ?? true),
		fresh: values.fresh ?? false,
		table: values.table,
	};
}

const cliOptions = parseCliArgs();

import { Database, DatabaseLayer } from "@packages/database/database";
import { Effect } from "effect";
import {
	clearCheckpoint,
	createInitialCheckpoint,
	loadCheckpoint,
	saveCheckpoint,
} from "./checkpoint";
import { getSnowflakeForDaysAgo, snowflakeToDate } from "./snowflake";
import {
	countChannelSettings,
	syncChannelSettings,
} from "./sync-channel-settings";
import { countChannels, syncChannels } from "./sync-channels";
import {
	countDiscordAccounts,
	syncDiscordAccounts,
} from "./sync-discord-accounts";
import { countMessages, syncMessages } from "./sync-messages";
import {
	countServerPreferences,
	syncServerPreferences,
} from "./sync-server-preferences";
import { countServers, syncServers } from "./sync-servers";

type TableName = (typeof TABLES)[number];

interface TableConfig {
	name: TableName;
	displayName: string;
	count: (minSnowflake: string) => Promise<number>;
	syncAll?: boolean;
	sync: (
		database: DatabaseService,
		ctx: {
			minSnowflake: string;
			options: CatchupOptions;
			onProgress: (cursor: string, count: number) => void;
		},
	) => Effect.Effect<SyncResult, Error>;
}

const TABLE_CONFIGS: TableConfig[] = [
	{
		name: "servers",
		displayName: "Servers",
		count: countServers,
		sync: syncServers,
	},
	{
		name: "serverPreferences",
		syncAll: true,
		displayName: "Server Preferences",
		count: countServerPreferences,
		sync: syncServerPreferences,
	},
	{
		name: "channels",
		displayName: "Channels",
		count: countChannels,
		sync: syncChannels,
	},
	{
		name: "channelSettings",
		displayName: "Channel Settings",
		syncAll: true,
		count: countChannelSettings,
		sync: syncChannelSettings,
	},
	{
		name: "discordAccounts",
		displayName: "Discord Accounts",
		count: countDiscordAccounts,
		sync: syncDiscordAccounts,
	},
	{
		name: "messages",
		displayName: "Messages",
		count: countMessages,
		sync: syncMessages,
	},
];

async function runTableSync(
	database: DatabaseService,
	config: TableConfig,
	checkpoint: CatchupCheckpoint,
	options: CatchupOptions,
): Promise<SyncResult> {
	if (checkpoint.completedTables.includes(config.name)) {
		console.log(`  ⏭️  ${config.displayName}: Already completed, skipping`);
		return { synced: 0, failed: 0, skipped: 0 };
	}

	const count = config.syncAll
		? await config.count("")
		: await config.count(checkpoint.minSnowflake);
	const rangeLabel = config.syncAll ? "total" : "in range";
	console.log(
		`\nSyncing ${config.displayName} (${count.toLocaleString()} rows ${rangeLabel})...`,
	);

	if (count === 0) {
		console.log(`  ✓ No rows to sync`);
		checkpoint.completedTables.push(config.name);
		if (!options.dryRun) {
			saveCheckpoint(checkpoint);
		}
		return { synced: 0, failed: 0, skipped: 0 };
	}

	checkpoint.currentTable = config.name;
	if (!options.dryRun) {
		saveCheckpoint(checkpoint);
	}

	let lastLoggedCount = 0;

	const result = await Effect.runPromise(
		config
			.sync(database, {
				minSnowflake: checkpoint.cursor[config.name] ?? checkpoint.minSnowflake,
				options,
				onProgress: (cursor, processedCount) => {
					checkpoint.cursor[config.name] = cursor;
					checkpoint.processedCount += processedCount - lastLoggedCount;
					lastLoggedCount = processedCount;

					if (!options.dryRun && processedCount % 100 === 0) {
						saveCheckpoint(checkpoint);
					}
				},
			})
			.pipe(
				Effect.catchAll((error) => {
					console.error(`  Error during sync:`, error);
					return Effect.succeed({ synced: 0, failed: 1, skipped: 0 });
				}),
			),
	);

	checkpoint.completedTables.push(config.name);
	checkpoint.currentTable = null;
	if (!options.dryRun) {
		saveCheckpoint(checkpoint);
	}

	const status = result.failed > 0 ? "⚠️" : "✓";
	console.log(
		`  ${status} ${config.displayName}: ${result.synced.toLocaleString()} synced, ${result.failed.toLocaleString()} failed`,
	);

	return result;
}

const program = Effect.gen(function* () {
	const options = cliOptions;
	const database = yield* Database;

	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║                    Catchup Sync                            ║");
	console.log("╚════════════════════════════════════════════════════════════╝");
	console.log();

	if (options.dryRun) {
		console.log("🔍 DRY RUN MODE - No changes will be made");
		console.log("   Use --no-dry-run to actually perform the sync\n");
	}

	const minSnowflake = getSnowflakeForDaysAgo(options.daysAgo);
	const cutoffDate = snowflakeToDate(minSnowflake);

	console.log(`📅 Syncing data from: ${cutoffDate.toISOString()}`);
	console.log(`   (past ${options.daysAgo} days)`);
	console.log(`   Min snowflake: ${minSnowflake}`);

	let checkpoint: CatchupCheckpoint;

	if (options.fresh) {
		console.log("\n🔄 Starting fresh (ignoring existing checkpoint)");
		clearCheckpoint();
		checkpoint = createInitialCheckpoint(minSnowflake);
	} else {
		const existingCheckpoint = loadCheckpoint();
		if (existingCheckpoint) {
			if (existingCheckpoint.minSnowflake !== minSnowflake) {
				console.log("\n⚠️  Checkpoint has different date range, starting fresh");
				clearCheckpoint();
				checkpoint = createInitialCheckpoint(minSnowflake);
			} else {
				console.log(
					`\n📋 Resuming from checkpoint (started: ${existingCheckpoint.startedAt})`,
				);
				console.log(
					`   Completed tables: ${existingCheckpoint.completedTables.join(", ") || "none"}`,
				);
				checkpoint = existingCheckpoint;
			}
		} else {
			checkpoint = createInitialCheckpoint(minSnowflake);
		}
	}

	const startTime = Date.now();
	const results: Record<string, SyncResult> = {};

	const tablesToSync = options.table
		? TABLE_CONFIGS.filter((c) => c.name === options.table)
		: TABLE_CONFIGS;

	if (options.table && tablesToSync.length === 0) {
		console.error(`\n❌ Unknown table: ${options.table}`);
		console.error(`   Valid tables: ${TABLES.join(", ")}`);
		process.exit(1);
	}

	for (const config of tablesToSync) {
		results[config.name] = yield* Effect.promise(() =>
			runTableSync(database, config, checkpoint, options),
		);
	}

	const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

	console.log("\n════════════════════════════════════════════════════════════");
	console.log("                         Summary                            ");
	console.log("════════════════════════════════════════════════════════════");

	let totalSynced = 0;
	let totalFailed = 0;

	for (const [name, result] of Object.entries(results)) {
		const config = TABLE_CONFIGS.find((c) => c.name === name);
		if (config && (result.synced > 0 || result.failed > 0)) {
			console.log(
				`  ${config.displayName}: ${result.synced.toLocaleString()} synced, ${result.failed.toLocaleString()} failed`,
			);
		}
		totalSynced += result.synced;
		totalFailed += result.failed;
	}

	console.log("────────────────────────────────────────────────────────────");
	console.log(
		`  Total: ${totalSynced.toLocaleString()} synced, ${totalFailed.toLocaleString()} failed`,
	);
	console.log(`  Time: ${elapsed} minutes`);

	if (options.dryRun) {
		console.log("\n🔍 This was a dry run. Use --no-dry-run to actually sync.");
	} else {
		console.log("\n✓ Catchup sync complete!");
		clearCheckpoint();
	}
});

Effect.runPromise(program.pipe(Effect.provide(DatabaseLayer))).catch(
	(error) => {
		console.error("\n❌ Fatal error:", error);
		process.exit(1);
	},
);
