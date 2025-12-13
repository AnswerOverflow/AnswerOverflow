import { Database, DatabaseLayer } from "@packages/database/database";
import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { getDb } from "../db/client";
import { dbUserServerSettings } from "../db/schema";
import { transformUserServerSettings } from "../transformers/user-server-settings";

const BATCH_SIZE = 5000;

export function syncUserServerSettings() {
	return Effect.gen(function* () {
		let cursor = "0";
		const convex = yield* Database;

		while (true) {
			const rows = yield* Effect.tryPromise({
				try: () =>
					getDb()
						.select()
						.from(dbUserServerSettings)
						.where(sql`${dbUserServerSettings.userId} > ${cursor}`)
						.orderBy(dbUserServerSettings.userId)
						.limit(BATCH_SIZE),
				catch: (e) => new Error(`Failed to fetch user server settings: ${e}`),
			});

			const lastRow = rows[rows.length - 1];
			if (lastRow) {
				cursor = lastRow.userId;
			}

			if (rows.length === 0) break;

			const settings = rows.map((row) => transformUserServerSettings(row));
			console.log(
				`Upserting ${settings.length} user server settings (cursor: ${cursor})`,
			);
			yield* convex.private.user_server_settings.upsertManyUserServerSettings({
				settings,
			});
		}
	});
}

export async function countUserServerSettings(): Promise<number> {
	const result = await getDb()
		.select({ count: sql<number>`COUNT(*)` })
		.from(dbUserServerSettings);

	return result[0]?.count ?? 0;
}

Effect.runPromise(syncUserServerSettings().pipe(Effect.provide(DatabaseLayer)));
