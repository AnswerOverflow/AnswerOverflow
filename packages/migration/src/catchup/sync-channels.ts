import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { getDb } from "../db/client";
import { dbChannels } from "../db/schema";
import { transformChannel } from "../transformers/channel";
import type { DatabaseService, SyncContext, SyncResult } from "./types";

const BATCH_SIZE = 100;
const CONCURRENT_WRITES = 50;

export function syncChannels(
	database: DatabaseService,
	ctx: SyncContext,
): Effect.Effect<SyncResult, Error> {
	return Effect.gen(function* () {
		const result: SyncResult = { synced: 0, failed: 0, skipped: 0 };
		const { minSnowflake, options, onProgress } = ctx;

		let cursor = minSnowflake;

		while (true) {
			const rows = yield* Effect.tryPromise({
				try: () =>
					getDb()
						.select()
						.from(dbChannels)
						.where(sql`${dbChannels.id} > ${cursor}`)
						.orderBy(dbChannels.id)
						.limit(BATCH_SIZE),
				catch: (e) => new Error(`Failed to fetch channels: ${e}`),
			});

			if (rows.length === 0) break;

			if (options.dryRun) {
				for (const row of rows) {
					const { channel } = transformChannel(row);
					result.synced++;
					if (result.synced <= 3) {
						console.log(
							`  Would sync channel: "${channel.name}" (${channel.id})`,
						);
					}
				}
			} else {
				const effects = rows.map((row) => {
					const { channel } = transformChannel(row);
					return Effect.gen(function* () {
						const syncEffect = database.private.channels.upsertChannel({
							channel: {
								id: BigInt(channel.id),
								serverId: BigInt(channel.serverId),
								name: channel.name,
								type: channel.type,
								parentId: channel.parentId
									? BigInt(channel.parentId)
									: undefined,
								archivedTimestamp: channel.archivedTimestamp,
							},
						});

						const syncResult = yield* Effect.either(syncEffect);

						if (syncResult._tag === "Left") {
							console.error(
								`  Failed to sync channel ${row.id}:`,
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

export async function countChannels(minSnowflake: string): Promise<number> {
	const result = await getDb()
		.select({ count: sql<number>`COUNT(*)` })
		.from(dbChannels)
		.where(sql`${dbChannels.id} > ${minSnowflake}`);

	return result[0]?.count ?? 0;
}
