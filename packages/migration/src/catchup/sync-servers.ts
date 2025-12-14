import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { getDb } from "../db/client";
import { dbServers } from "../db/schema";
import { transformServer } from "../transformers/server";
import type { DatabaseService, SyncContext, SyncResult } from "./types";

const BATCH_SIZE = 100;
const CONCURRENT_WRITES = 50;

export function syncServers(
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
						.from(dbServers)
						.where(sql`${dbServers.id} > ${cursor}`)
						.orderBy(dbServers.id)
						.limit(BATCH_SIZE),
				catch: (e) => new Error(`Failed to fetch servers: ${e}`),
			});

			if (rows.length === 0) break;

			if (options.dryRun) {
				for (const row of rows) {
					const { server } = transformServer(row);
					result.synced++;
					if (result.synced <= 3) {
						console.log(
							`  Would sync server: "${server.name}" (${server.discordId})`,
						);
					}
				}
			} else {
				const effects = rows.map((row) => {
					const { server } = transformServer(row);
					return Effect.gen(function* () {
						const syncEffect = database.private.servers.upsertServer({
							discordId: BigInt(server.discordId),
							name: server.name,
							icon: server.icon,
							description: server.description,
							vanityInviteCode: server.vanityInviteCode,
							kickedTime: server.kickedTime,
							approximateMemberCount: server.approximateMemberCount,
						});

						const syncResult = yield* Effect.either(syncEffect);

						if (syncResult._tag === "Left") {
							console.error(
								`  Failed to sync server ${row.id}:`,
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

export async function countServers(minSnowflake: string): Promise<number> {
	const result = await getDb()
		.select({ count: sql<number>`COUNT(*)` })
		.from(dbServers)
		.where(sql`${dbServers.id} > ${minSnowflake}`);

	return result[0]?.count ?? 0;
}
