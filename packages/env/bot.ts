import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';


export const env = createEnv({
	server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    DISCORD_TOKEN: z.string().min(1),
    VERCEL_URL: z.string().min(1),
    DEFAULT_DELAY_IN_MS: z.number().int().min(1),
    DATABASE_URL: z.string(),
    ELASTICSEARCH_URL: z.string(),
    ELASTICSEARCH_PASSWORD: z.string(),
    ELASTICSEARCH_USERNAME: z.string(),
    ELASTICSEARCH_MESSAGE_INDEX: z.string(),
    REDIS_URL: z.string(),
    ELASTICSEARCH_CLOUD_ID: z.string(),
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    SKIP_ENV_VALIDATION: z.string(),
    CI: z.string(),
    INDEXING_INTERVAL_IN_HOURS: z.string(),
    BOT_DEV_LOG_LEVEL: z.string(), // todo make these enums
    BOT_TEST_LOG_LEVEL: z.string(),
    BOT_PROD_LOG_LEVEL: z.string(),
    SENTRY_DSN: z.string().min(1),
    MAXIMUM_CHANNEL_MESSAGES_PER_INDEX: z.number().int().min(1),
    INDEXING_DISABLED: z.boolean(),
    MAX_NUMBER_OF_THREADS_TO_COLLECT: z.number().int().min(1),
	},
	client: {
		NEXT_PUBLIC_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: z.string().min(1),
    NEXT_PUBLIC_DEPLOYMENT_ENV: z.string().min(1), // todo: make enum
    THEME: z.string().optional(), // todo: make enum
    PORT: z.string().optional(),
	},
	// If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
	runtimeEnv: {
		...process.env,
	},
	// For Next.js >= 13.4.4, you only need to destructure client variables:
	// experimental__runtimeEnv: {
	//   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
	// }
});
