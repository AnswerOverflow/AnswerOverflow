/* eslint-disable n/no-process-env */
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';
import { sharedEnvs } from './shared';

export const botEnv = {
	...sharedEnvs,
	...createEnv({
		server: {
			DISCORD_TOKEN: z.string(),
			/*
        TODO: Make these feature flags / configurable elsewhere
       */
			PRINT_COMMUNITIES: z
				.string()
				.optional()
				.default('false')
				.pipe(z.boolean()),
			STATUS_UPDATE_INTERVAL_IN_HOURS: z
				.string()
				.optional()
				.default('1')
				.transform((s) => parseFloat(s))
				.pipe(z.number()),
			INDEXING_DISABLED: z
				.string()
				.optional()
				.default('false')
				.pipe(z.boolean()),
			INDEXING_INTERVAL_IN_HOURS: z
				.string()
				.optional()
				.default('6')
				.transform((s) => parseFloat(s))
				.pipe(z.number()),
			MAX_NUMBER_OF_THREADS_TO_COLLECT: z
				.string()
				.optional()
				.default('5000')
				.transform((s) => parseInt(s, 10))
				.pipe(z.number()),
			MAX_NUMBER_OF_MESSAGES_TO_COLLECT: z
				.string()
				.optional()
				.default('20000')
				.transform((s) => parseInt(s, 10))
				.pipe(z.number()),
		},
		experimental__runtimeEnv: process.env,
	}),
};
