import type { Config } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({
	path: '../../.env',
});

export default {
	schema: './schema.ts',
	out: './drizzle',
	driver: 'mysql2',
	dbCredentials: {
		connectionString: process.env['DATABASE_URL'] ?? '',
	},
} satisfies Config;
