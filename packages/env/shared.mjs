import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const envNumber = z
	.string()
	// transform to number
	.transform((s) => parseInt(s, 10))
	// make sure transform worked
	.pipe(z.boolean());

export const sharedEnvs = createEnv({
	// TODO: Fix
	isServer: typeof window === 'undefined',
	server: {
		/*
      Environment
     */
		NODE_ENV: z
			.string()
			.optional()
			.default('development')
			.pipe(z.enum(['development', 'production', 'test'])),
		// SKIP_ENV_VALIDATION: z.string(),
		// CI: z.string(),
		// /*
		//   Database
		//  */
		DATABASE_URL: z.string().optional(),
		// ELASTICSEARCH_URL: z.string(),
		// ELASTICSEARCH_PASSWORD: z.string(),
		// ELASTICSEARCH_USERNAME: z.string(),
		// ELASTICSEARCH_MESSAGE_INDEX: z.string(),
		// REDIS_URL: z.string(),
		// ELASTICSEARCH_CLOUD_ID: z.string(),
		// /*
		//   Discord
		//  */
		// DISCORD_CLIENT_ID: z.string(),
		// DISCORD_CLIENT_SECRET: z.string(),
		// DISCORD_TOKEN: z.string().min(1),
		// /*
		//   Analytics
		//  */
		// POSTHOG_PROJECT_ID: envNumber,
		// POSTHOG_PERSONAL_API_KEY: z.string(),
		// /*
		//   Payments
		//  */
		// STRIPE_PRO_PLAN_PRICE_ID: z.string(),
		// STRIPE_PAGE_VIEWS_PRICE_ID: z.string(),
		// STRIPE_SECRET_KEY: z.string(),
		// STRIPE_WEBHOOK_SECRET: z.string(),
		// STRIPE_CHECKOUT_URL: z.string(),
		// /*
		//   Multi Tenant
		//  */
		// PROJECT_ID_VERCEL: z.string(),
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
