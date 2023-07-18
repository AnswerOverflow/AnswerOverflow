import {createEnv} from '@t3-oss/env-nextjs';
import {z} from 'zod';

export const envNumber = z
  .string()
  // transform to number
  .transform((s) => parseInt(s, 10))
  // make sure transform worked
  .pipe(z.boolean());

export const nodeEnv = z
  .string()
  .optional()
  .default('development')
  .pipe(z.enum(['development', 'production', 'test']));

export const sharedClientEnvs = {
  NEXT_PUBLIC_POSTHOG_TOKEN: z.string(),
  NEXT_PUBLIC_SENTRY_DSN: z.string(),
  NEXT_PUBLIC_DEPLOYMENT_ENV: z.string().pipe(
    z.enum(['local', 'staging', 'production', 'ci'])
  )
  NEXT_PUBLIC_SITE_URL: z.string().url()
}

export const sharedEnvs = createEnv({
  // TODO: Fix
  isServer: typeof window === 'undefined',
  server: {
    /*
      Environment
     */
    NODE_ENV: nodeEnv,
    ENVIRONMENT: z.string().pipe(
      z.enum(['discord-bot', 'main-site'])
    ),
    // SKIP_ENV_VALIDATION: z.string(),
    // CI: z.string(),

    /*
      Database
     */
    DATABASE_URL: z.string(),

    // TODO: Make it cloud ID oro username / password, not both
    ELASTICSEARCH_URL: z.string().optional(),
    ELASTICSEARCH_CLOUD_ID: z.string().optional(),
    ELASTICSEARCH_PASSWORD: z.string(),
    ELASTICSEARCH_USERNAME: z.string(),
    ELASTICSEARCH_MESSAGE_INDEX: z.string(),

    REDIS_URL: z.string(),

    /*
      Discord
     */
    DISCORD_CLIENT_ID: z.string(),
    DISCORD_CLIENT_SECRET: z.string(),
    /*
      Analytics
     */
    POSTHOG_PROJECT_ID: envNumber,
    POSTHOG_PERSONAL_API_KEY: z.string(),
    /*
      Payments
     */

    STRIPE_PRO_PLAN_PRICE_ID: z.string(),
    STRIPE_ENTERPRISE_PLAN_PRICE_ID: z.string(),
    STRIPE_SECRET_KEY: z.string(),
    STRIPE_WEBHOOK_SECRET: z.string(),
    STRIPE_CHECKOUT_URL: z.string(),
    /*
      Multi Tenant
     */
      PROJECT_ID_VERCEL: z.string(),
      AUTH_BEARER_TOKEN_VERCEL: z.string(),
    TEAM_ID_VERCEL: z.string(),

  },
  client: sharedClientEnvs,
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  experimental__runtimeEnv: process.env,
  },
  // For Next.js >= 13.4.4, you only need to destructure client variables:
  // experimental__runtimeEnv: {
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  // }
});
