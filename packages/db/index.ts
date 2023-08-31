import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import { sharedEnvs } from '@answeroverflow/env/shared';
import * as schema from './src/schema';

const connection = connect({
	url: sharedEnvs.DATABASE_URL,
});

export const db = drizzle(connection, {
	schema,
});
