import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({
	path: '../../.env',
});

export default {
	schema: './src/schema.ts',
	out: './drizzle',
	driver: 'mysql2',
	dbCredentials: {
		// eslint-disable-next-line n/no-process-env
		connectionString: process.env['DATABASE_URL'] ?? '',
	},
} satisfies Config;
