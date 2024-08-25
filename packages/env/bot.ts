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
				.transform((s) => {
					if (s.length === 0) {
						return 'false';
					}
					return s;
				})
				.refine(
					(value) => {
						return value === 'true' || value === 'false';
					},
					{
						message: 'Must be either "true" or "false"',
					},
				)
				.transform((s) => s === 'true')
				.pipe(z.boolean()),
			STATUS_UPDATE_INTERVAL_IN_HOURS: z
				.string()
				.optional()
				.default('1')
				.transform((s) => {
					if (s.length === 0) {
						return parseFloat('1');
					}
					return parseFloat(s);
				})
				.pipe(z.number()),
			INDEXING_DISABLED: z
				.string()
				.optional()
				.default('false')
				.transform((s) => {
					if (s?.length === 0) {
						return 'false';
					}
					return s;
				})
				.refine(
					(value) => {
						return value === 'true' || value === 'false';
					},
					{
						message: 'Must be either "true" or "false"',
					},
				)
				.transform((s) => s === 'true')
				.pipe(z.boolean()),
			INDEXING_INTERVAL_IN_HOURS: z
				.string()
				.optional()
				.default('6')
				.transform((s) => {
					if (s.length === 0) {
						return parseFloat('6');
					}
					return parseFloat(s);
				})
				.pipe(z.number()),
			MAX_NUMBER_OF_THREADS_TO_COLLECT: z
				.string()
				.optional()
				.default('5000')
				.transform((s) => {
					if (s.length === 0) {
						return parseInt('5000', 10);
					}
					return parseInt(s, 10);
				})
				.pipe(z.number()),
			MAX_NUMBER_OF_MESSAGES_TO_COLLECT: z
				.string()
				.optional()
				.default('20000')
				.transform((s) => {
					if (s.length === 0) {
						return parseInt('25000', 10);
					}
					return parseInt(s, 10);
				})
				.pipe(z.number()),
		},
		experimental__runtimeEnv: process.env,

		skipValidation: process.env.SKIP_ENV_CHECK === 'true',
	}),
};
