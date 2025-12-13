import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { getDb } from "../db/client";
import { dbDiscordAccounts } from "../db/schema";
import { transformDiscordAccount } from "../transformers/discord-account";
import type { DatabaseService, SyncContext, SyncResult } from "./types";

const BATCH_SIZE = 100;
const CONCURRENT_WRITES = 50;

export function syncDiscordAccounts(
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
						.from(dbDiscordAccounts)
						.where(sql`${dbDiscordAccounts.id} > ${cursor}`)
						.orderBy(dbDiscordAccounts.id)
						.limit(BATCH_SIZE),
				catch: (e) => new Error(`Failed to fetch discord accounts: ${e}`),
			});

			if (rows.length === 0) break;

			if (options.dryRun) {
				for (const row of rows) {
					const account = transformDiscordAccount(row);
					result.synced++;
					if (result.synced <= 3) {
						console.log(
							`  Would sync discord account: "${account.name}" (${account.id})`,
						);
					}
				}
			} else {
				const effects = rows.map((row) => {
					const account = transformDiscordAccount(row);
					return Effect.gen(function* () {
						const syncEffect =
							database.private.discord_accounts.upsertDiscordAccount({
								account: {
									id: BigInt(account.id),
									name: account.name,
									avatar: account.avatar,
								},
							});

						const syncResult = yield* Effect.either(syncEffect);

						if (syncResult._tag === "Left") {
							console.error(
								`  Failed to sync discord account ${row.id}:`,
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

export async function countDiscordAccounts(
	minSnowflake: string,
): Promise<number> {
	const result = await getDb()
		.select({ count: sql<number>`COUNT(*)` })
		.from(dbDiscordAccounts)
		.where(sql`${dbDiscordAccounts.id} > ${minSnowflake}`);

	return result[0]?.count ?? 0;
}
