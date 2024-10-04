import { sharedEnvs } from '@answeroverflow/env/shared';
import dotenv from 'dotenv';
import type { Config } from 'drizzle-kit';
dotenv.config({
	path: '../../.env',
});

// ps proxy has some issues w/ db push, so here's a workaround
let dbUrl =
	// eslint-disable-next-line n/no-process-env
	sharedEnvs.DATABASE_URL ?? 'http://root:nonNullPassword@localhost:3900';
if (dbUrl.includes('http') && dbUrl.includes('localhost')) {
	dbUrl = dbUrl.replace('http', 'mysql');
	// remove from second : to @
	const start = dbUrl.indexOf(':', 7);
	const end = dbUrl.indexOf('@');
	dbUrl = dbUrl.slice(0, start) + dbUrl.slice(end);
	// remove :3900
	dbUrl = dbUrl.replace(':3900', '');
	// add /planetscale
	dbUrl += '/planetscale';
}
export default {
	schema: './src/schema.ts',
	out: './drizzle',
	driver: 'mysql2',
	dbCredentials: {
		// eslint-disable-next-line n/no-process-env
		connectionString: dbUrl,
	},
} satisfies Config;
