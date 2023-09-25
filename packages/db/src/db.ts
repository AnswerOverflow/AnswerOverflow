import { sharedEnvs } from '@answeroverflow/env/shared';
import * as schema from './schema';
import { PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';
const dbUrl = sharedEnvs.DATABASE_URL;

/*
The two database connection files is to allow contributors / CI to not have to use PlanetScale.
If you are a contributor, you can run the 'use-mysql2' script from the root of the repository to switch to MySQL.
These files will be merged into one file with dynamic imports when we move to bun and get top level await, at the moment
dynamic imports and top level await dont work with the bot. if you can fix it make a pr 💖
 */

const isPsDb = dbUrl.includes('psdb') || dbUrl.includes('pscale_pw');
if (!isPsDb) {
	console.error(
		"Database URL is not a PlanetScale database URL. You need to either use a PlanetScale database or run the 'use-mysql2' script from the root of the repository.",
	);
	// eslint-disable-next-line n/no-process-exit
	process.exit(1);
}
import { drizzle as psDrizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import 'json-bigint-patch';

export const db: PlanetScaleDatabase<typeof schema> = psDrizzle(
	connect({
		url: dbUrl,
	}),
	{ schema },
);
