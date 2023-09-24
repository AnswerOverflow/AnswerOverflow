import { sharedEnvs } from '@answeroverflow/env/shared';
import * as schema from './schema';
import { drizzle as mysqlDrizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';
const dbUrl = sharedEnvs.DATABASE_URL;

/*
The two database connection files is to allow contributors / CI to not have to use PlanetScale.
If you are a contributor, you can run the 'use-mysql2' script from the root of the repository to switch to MySQL.
These files will be merged into one file with dynamic imports when we move to bun and get top level await, at the moment
dynamic imports and top level await dont work with the bot. if you can fix it make a pr 💖
 */
import JSONBig from 'json-bigint';
export const db: PlanetScaleDatabase<typeof schema> = mysqlDrizzle(
	// @ts-expect-error
	mysql.createPool({
		supportBigNumbers: true,
		bigNumberStrings: true,
		uri: dbUrl,
		JSONParser: JSONBig,
	}),
	{
		schema,
		mode: 'default',
	},
) as unknown as PlanetScaleDatabase<typeof schema>;
