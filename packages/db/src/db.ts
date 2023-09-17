import { sharedEnvs } from '@answeroverflow/env/shared';

import {
	drizzle as psDrizzle,
	PlanetScaleDatabase,
} from 'drizzle-orm/planetscale-serverless';
import { connect } from '@planetscale/database';

import * as schema from './schema';

const dbUrl = sharedEnvs.DATABASE_URL;

// Allow for connecting to a local database
export const db: PlanetScaleDatabase<typeof schema> = psDrizzle(
	connect({
		url: dbUrl,
	}),
	{ schema },
);
