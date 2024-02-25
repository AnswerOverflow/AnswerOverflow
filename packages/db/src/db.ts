import { sharedEnvs } from '@answeroverflow/env/shared';
import * as schema from './schema';
import { PlanetScaleDatabase } from 'drizzle-orm/planetscale-serverless';
import { drizzle as psDrizzle } from 'drizzle-orm/planetscale-serverless';
import { cast, Client } from '@planetscale/database';
import { JSONParse } from './utils/json-big';

const dbUrl = sharedEnvs.DATABASE_URL;

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
	});

const client = new Client({
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
});
export const db: PlanetScaleDatabase<typeof schema> = psDrizzle(
	// @ts-ignore
	client,
	{ schema },
);
