import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
	if (_db) return _db;

	const url = process.env.OLD_DATABASE_URL;
	if (!url) {
		throw new Error("OLD_DATABASE_URL environment variable is required");
	}

	const client = new Client({
		url,
		cast: (field, value) => {
			if (field.type === "JSON" && value !== null) {
				return JSON.parse(value);
			}
			return value;
		},
	});

	_db = drizzle(client, { schema });
	return _db;
}

export type DbClient = ReturnType<typeof getDb>;
