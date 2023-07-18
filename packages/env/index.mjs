import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';


  "MAXIMUM_CHANNEL_MESSAGES_PER_INDEX",
  "VITEST_DISCORD_CLIENT_ID",
  "THEME",
  "NEXT_PUBLIC_DEPLOYMENT_ENV",
  "SENTRY_DSN",
  "INDEXING_DISABLED",
  "MAX_NUMBER_OF_THREADS_TO_COLLECT",
  "NEXT_PUBLIC_POSTHOG_TOKEN",
  "STATUS_UPDATE_INTERVAL_IN_HOURS",
  "PRINT_COMMUNITIES",
  "MAX_NUMBER_OF_MESSAGES_TO_COLLECT",
  "STRIPE_PRO_PLAN_PRICE_ID",
  "STRIPE_PAGE_VIEWS_PRICE_ID",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "POSTHOG_PERSONAL_API_KEY",
  "POSTHOG_PROJECT_ID",
  "LADLE",
  "ENVIRONMENT",
  "STRIPE_CHECKOUT_URL",
  "STRIPE_ENTERPRISE_PLAN_PRICE_ID"

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
	},
	client: {
		NEXT_PUBLIC_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: z.string().min(1),
    PORT: z.string().optional(),
	},
	// If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		OPEN_AI_API_KEY: process.env.OPEN_AI_API_KEY,
		NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
	},
	// For Next.js >= 13.4.4, you only need to destructure client variables:
	// experimental__runtimeEnv: {
	//   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
	// }
});
