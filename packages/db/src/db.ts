import { sharedEnvs } from '@answeroverflow/env/shared';
import * as schema from './schema';
import { PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';
const dbUrl = sharedEnvs.DATABASE_URL;

if (!dbUrl.includes('psdb') || dbUrl.includes('pscale_pw')) {
	console.error(
		'Database URL is not a PlanetScale database URL. You need to either use a PlanetScale database or swap the connection used in db.ts.',
	);
	// eslint-disable-next-line n/no-process-exit
	process.exit(1);
}
import { drizzle as psDrizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';

export const db: PlanetScaleDatabase<typeof schema> = psDrizzle(
	connect({
		url: dbUrl,
	}),
	{ schema },
);

// import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
// import mysql from 'mysql2/promise';
// export const db: PlanetScaleDatabase<typeof schema> = mysqlDrizzle(
// 	mysql.createPool(dbUrl),
// 	{
// 		schema,
// 		mode: 'default',
// 	},
// ) as unknown as PlanetScaleDatabase<typeof schema>;
