import { sharedEnvs } from '@answeroverflow/env/shared';

import {
	drizzle as psDrizzle,
	PlanetScaleDatabase,
} from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';

import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import * as schema from './schema';

const dbUrl =
	sharedEnvs.NODE_ENV === 'test' && sharedEnvs.TEST_DATABASE_URL
		? sharedEnvs.TEST_DATABASE_URL
		: sharedEnvs.DATABASE_URL;

// Allow for connecting to a local database
export const db: PlanetScaleDatabase<typeof schema> =
	dbUrl.includes('psdb') || dbUrl.includes('pscale_pw')
		? psDrizzle(
				connect({
					url: dbUrl,
				}),
				{ schema },
		  )
		: // It's probably fine to lie to TS here, the api should be the same for both
		  // @ts-expect-error
		  (mysqlDrizzle(mysql.createPool(dbUrl), {
				schema,
				mode: 'default',
		  }) as PlanetScaleDatabase<typeof schema>);
