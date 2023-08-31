import { drizzle } from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';
import { sharedEnvs } from '@answeroverflow/env/shared';

const connection = connect({
	url: sharedEnvs.DATABASE_URL,
});

export const db = drizzle(connection);
