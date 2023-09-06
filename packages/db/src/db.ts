import { sharedEnvs } from '@answeroverflow/env/shared';
import * as schema from './schema';

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
const connection = await mysql.createConnection({
	uri: sharedEnvs.DATABASE_URL,
});

export const db = drizzle(connection, { schema, mode: 'default' });
