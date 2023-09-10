import { sharedEnvs } from '@answeroverflow/env/shared';

import {
	drizzle as psDrizzle,
	PlanetScaleDatabase,
} from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';

import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import * as schema from './schema';

// Allow for connecting to a local database
export const db: PlanetScaleDatabase<typeof schema> =
	sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production'
		? psDrizzle(
				connect({
					url: sharedEnvs.DATABASE_URL,
				}),
				{ schema },
		  )
		: // It's probably fine to lie to TS here, the api should be the same for both
		  // @ts-expect-error
		  (mysqlDrizzle(mysql.createPool(sharedEnvs.DATABASE_URL), {
				schema,
				mode: 'default',
		  }) as PlanetScaleDatabase<typeof schema>);
