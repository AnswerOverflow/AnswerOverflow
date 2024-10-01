/* eslint-disable n/no-process-env */

import {
	sharedEnvs,
	nodeEnv,
	sharedClientEnvs,
	zStringRequiredInProduction,
} from './shared';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const webServerEnv = sharedEnvs;

export const webClientEnv = createEnv({
	client: {
		...sharedClientEnvs,
		NEXT_PUBLIC_NODE_ENV: nodeEnv,
		NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: z.string().optional().default('No SHA'),
		NEXT_PUBLIC_LADLE: z
			.string()
			.default('false')
			.refine(
				(value) => {
					return value === 'true' || value === 'false';
				},
				{
					message: 'Must be either "true" or "false"',
				},
			)
			.transform((s) => s === 'true')
			.pipe(z.boolean())
			.optional(),
		NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
		NEXT_PUBLIC_PORT: z
			.string()
			.transform((s) => parseInt(s, 10))
			.pipe(z.number())
			.optional(),
		NEXT_PUBLIC_GA_MEASUREMENT_ID: zStringRequiredInProduction,
	},
	experimental__runtimeEnv: {
		NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
		NEXT_PUBLIC_POSTHOG_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_TOKEN,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
		NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
		NEXT_PUBLIC_LADLE: process.env.LADLE,
		NEXT_PUBLIC_VERCEL_URL: process.env.VERCEL_URL,
		NEXT_PUBLIC_PORT: process.env.PORT,
	},

	skipValidation: process.env.SKIP_ENV_CHECK === 'true',
});
