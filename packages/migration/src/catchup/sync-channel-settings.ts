import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { getDb } from "../db/client";
import { dbChannels } from "../db/schema";
import { transformChannel } from "../transformers/channel";
import type { DatabaseService, SyncContext, SyncResult } from "./types";

const BATCH_SIZE = 100;
const CONCURRENT_WRITES = 50;

export function syncChannelSettings(
	database: DatabaseService,
	ctx: SyncContext,
): Effect.Effect<SyncResult, Error> {
	return Effect.gen(function* () {
		const result: SyncResult = { synced: 0, failed: 0, skipped: 0 };
		const { options, onProgress } = ctx;

		let cursor = "0";

		while (true) {
			const rows = yield* Effect.tryPromise({
				try: () =>
					getDb()
						.select()
						.from(dbChannels)
						.where(
							sql`${dbChannels.id} > ${cursor} AND ${dbChannels.type} NOT IN (10, 11, 12)`,
						)
						.orderBy(dbChannels.id)
						.limit(BATCH_SIZE),
				catch: (e) => new Error(`Failed to fetch channels for settings: ${e}`),
			});

			if (rows.length === 0) break;

			if (options.dryRun) {
				for (const row of rows) {
					const { channelSettings } = transformChannel(row);
					result.synced++;
					if (result.synced <= 3) {
						console.log(
							`  Would sync channel settings for: ${channelSettings.channelId} (indexing: ${channelSettings.indexingEnabled})`,
						);
					}
				}
			} else {
				const effects = rows.map((row) => {
					const { channelSettings } = transformChannel(row);
					return Effect.gen(function* () {
						const syncEffect = database.private.channels.updateChannelSettings({
							channelId: BigInt(channelSettings.channelId),
							settings: {
								indexingEnabled: channelSettings.indexingEnabled,
								markSolutionEnabled: channelSettings.markSolutionEnabled,
								sendMarkSolutionInstructionsInNewThreads:
									channelSettings.sendMarkSolutionInstructionsInNewThreads,
								autoThreadEnabled: channelSettings.autoThreadEnabled,
								forumGuidelinesConsentEnabled:
									channelSettings.forumGuidelinesConsentEnabled,
								solutionTagId: channelSettings.solutionTagId
									? BigInt(channelSettings.solutionTagId)
									: undefined,
								inviteCode: channelSettings.inviteCode,
							},
						});

						const syncResult = yield* Effect.either(syncEffect);

						if (syncResult._tag === "Left") {
							console.error(
								`  Failed to sync channel settings ${row.id}:`,
								syncResult.left,
							);
							return { success: false };
						}
						return { success: true };
					});
				});

				const results = yield* Effect.all(effects, {
					concurrency: CONCURRENT_WRITES,
				});

				for (const r of results) {
					if (r.success) {
						result.synced++;
					} else {
						result.failed++;
					}
				}
			}

			const lastRow = rows[rows.length - 1];
			if (lastRow) {
				cursor = lastRow.id;
				onProgress(cursor, result.synced + result.failed);
			}
		}

		return result;
	});
}

export async function countChannelSettings(): Promise<number> {
	const result = await getDb()
		.select({ count: sql<number>`COUNT(*)` })
		.from(dbChannels)
		.where(sql`${dbChannels.type} NOT IN (10, 11, 12)`);

	return result[0]?.count ?? 0;
}
