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

const isPsDb =
	// eslint-disable-next-line n/no-process-env
	dbUrl.includes('psdb') || dbUrl.includes('pscale_pw') || !!process.env.CI;
if (!isPsDb) {
	console.error(
		"Database URL is not a PlanetScale database URL. You need to either use a PlanetScale database or run the 'use-mysql2' script from the root of the repository.",
	);
	// eslint-disable-next-line n/no-process-exit
	process.exit(1);
}
import { drizzle as psDrizzle } from 'drizzle-orm/planetscale-serverless';
import { cast, connect } from '@planetscale/database';
import { JSONParse } from './utils/json-big';

const decoder = new TextDecoder('utf-8');
function bytes(text: string): number[] {
	return text.split('').map((c) => c.charCodeAt(0));
}

const cachedFetch = (input: any, init?: any) =>
	// @ts-ignore
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-argument
	fetch(input, {
		...init,
		cache: sharedEnvs.ENVIRONMENT === 'main-site' ? 'force-cache' : 'no-cache',
		next: {
			tags: ['cache'],
		},
	});
export const db: PlanetScaleDatabase<typeof schema> = psDrizzle(
	connect({
		url: dbUrl,
		fetch: cachedFetch,
		cast: (field, value) => {
			if (field.type === 'JSON') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-return
				if (value === null) return null;
				return JSONParse(decoder.decode(Uint8Array.from(bytes(value))));
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return cast(field, value);
		},
	}),
	{ schema },
);
