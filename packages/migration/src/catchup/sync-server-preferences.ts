import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { getDb } from "../db/client";
import { dbServers, type Plan } from "../db/schema";
import { transformServer } from "../transformers/server";
import type { DatabaseService, SyncContext, SyncResult } from "./types";

const BATCH_SIZE = 100;
const CONCURRENT_WRITES = 50;

export function syncServerPreferences(
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
						.from(dbServers)
						.where(sql`${dbServers.id} > ${cursor}`)
						.orderBy(dbServers.id)
						.limit(BATCH_SIZE),
				catch: (e) =>
					new Error(`Failed to fetch servers for preferences: ${e}`),
			});

			if (rows.length === 0) break;

			if (options.dryRun) {
				for (const row of rows) {
					const { serverPreferences } = transformServer(row);
					result.synced++;
					if (result.synced <= 3) {
						console.log(
							`  Would sync server preferences for: ${serverPreferences.serverId} (plan: ${serverPreferences.plan})`,
						);
					}
				}
			} else {
				const effects = rows.map((row) => {
					const { serverPreferences } = transformServer(row);
					return Effect.gen(function* () {
						const syncEffect =
							database.private.server_preferences.upsertServerPreferences({
								serverId: BigInt(serverPreferences.serverId),
								stripeCustomerId: serverPreferences.stripeCustomerId,
								stripeSubscriptionId: serverPreferences.stripeSubscriptionId,
								plan: serverPreferences.plan as Plan,
								readTheRulesConsentEnabled:
									serverPreferences.readTheRulesConsentEnabled,
								considerAllMessagesPublicEnabled:
									serverPreferences.considerAllMessagesPublicEnabled,
								anonymizeMessagesEnabled:
									serverPreferences.anonymizeMessagesEnabled,
								customDomain: serverPreferences.customDomain,
								subpath: serverPreferences.subpath,
							});

						const syncResult = yield* Effect.either(syncEffect);

						if (syncResult._tag === "Left") {
							console.error(
								`  Failed to sync server preferences ${row.id}:`,
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

export async function countServerPreferences(): Promise<number> {
	const result = await getDb()
		.select({ count: sql<number>`COUNT(*)` })
		.from(dbServers);

	return result[0]?.count ?? 0;
}
