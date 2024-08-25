/* eslint-disable n/no-process-env */
process.env = {
	...process.env,
	NODE_ENV: process.env.NODE_ENV ?? 'development',
	NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV ?? 'local',
};

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const envNumber = z
	.string()
	.transform((s) => parseInt(s, 10))
	.pipe(z.number());

export const zStringRequiredInProduction = z
	.string()
	.optional()
	.refine(
		(token) => {
			if (
				process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local' ||
				process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'ci' ||
				process.env.NODE_ENV === 'development' ||
				process.env.NODE_ENV === 'test'
			) {
				return true;
			}
			return token ? token.length > 0 : false;
		},
		{ message: 'Required in production' },
	);

export const zNumberRequiredInProduction = z
	.string()
	.optional()
	.refine(
		(token) => {
			if (
				process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local' ||
				process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'ci' ||
				process.env.NODE_ENV === 'development' ||
				process.env.NODE_ENV === 'test'
			) {
				return true;
			}
			return token ? token.length > 0 : false;
		},
		{ message: 'Required in production' },
	)
	.transform((s) => {
		if (s) {
			return parseInt(s, 10);
		}
		return undefined;
	})
	.pipe(z.number().optional());

export const nodeEnv = z
	.string()
	.optional()
	.default('development')
	.pipe(z.enum(['development', 'production', 'test']));

export function zStringDefaultInDev(defaultValue: string) {
	const isDev =
		process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'local' ||
		process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'ci' ||
		process.env.NODE_ENV === 'development' ||
		process.env.NODE_ENV === 'test';
	if (!isDev) {
		return z.string();
	}
	return z.string().optional().default(defaultValue);
}

export const sharedClientEnvs = {
	NEXT_PUBLIC_POSTHOG_TOKEN: zStringRequiredInProduction,
	NEXT_PUBLIC_SENTRY_DSN: zStringRequiredInProduction,
	NEXT_PUBLIC_DEPLOYMENT_ENV: zStringDefaultInDev('local').pipe(
		z.enum(['local', 'staging', 'production', 'ci']),
	),
	NEXT_PUBLIC_SITE_URL: zStringDefaultInDev('http://localhost:3000'),
};

export const sharedEnvs = createEnv({
	server: {
		/*
      Environment
     */
		NODE_ENV: nodeEnv,
		ENVIRONMENT: zStringDefaultInDev('discord-bot').pipe(
			z.enum(['discord-bot', 'main-site', 'docs', 'dashboard']),
		),
		// SKIP_ENV_VALIDATION: z.string(),
		// CI: z.string(),

		/*
      Database
     */
		DATABASE_URL: zStringDefaultInDev(
			'http://root:nonNullPassword@localhost:3900',
		),
		DATABASE_URL_REPLICA: z.string().optional(),

		ELASTICSEARCH_URL:
			process.env.NODE_ENV === 'production' &&
			process.env.NEXT_PUBLIC_DEPLOYMENT_ENV !== 'local'
				? z.string().optional()
				: zStringDefaultInDev('http://localhost:9200'),
		ELASTICSEARCH_CLOUD_ID: zStringRequiredInProduction,
		ELASTICSEARCH_PASSWORD: zStringDefaultInDev('changeme'),
		ELASTICSEARCH_USERNAME: zStringDefaultInDev('elastic'),
		ELASTICSEARCH_MESSAGE_INDEX: zStringDefaultInDev('messages'),

		REDIS_URL: zStringDefaultInDev('redis://:redis@localhost:6379'),

		/*
      Discord
     */
		DISCORD_CLIENT_ID: z.string(),
		DISCORD_CLIENT_SECRET: z.string(),
		/*
      Analytics
     */
		POSTHOG_PROJECT_ID: zNumberRequiredInProduction,
		POSTHOG_PERSONAL_API_KEY: zStringRequiredInProduction,
		AXIOM_API_KEY: zStringRequiredInProduction,
		/*
      Payments
     */

		STRIPE_PRO_PLAN_PRICE_ID: zStringRequiredInProduction,
		STRIPE_ENTERPRISE_PLAN_PRICE_ID: zStringRequiredInProduction,
		STRIPE_SECRET_KEY: zStringRequiredInProduction,
		STRIPE_WEBHOOK_SECRET: zStringRequiredInProduction,
		STRIPE_CHECKOUT_URL: zStringRequiredInProduction,
		/*
      Multi Tenant
     */
		PROJECT_ID_VERCEL: zStringRequiredInProduction,
		AUTH_BEARER_TOKEN_VERCEL: zStringRequiredInProduction,
		TEAM_ID_VERCEL: zStringRequiredInProduction,
		BUCKET_NAME: zStringRequiredInProduction,
		IAM_USER_KEY: zStringRequiredInProduction,
		IAM_USER_SECRET: zStringRequiredInProduction,
	},
	client: sharedClientEnvs,
	experimental__runtimeEnv: {
		NEXT_PUBLIC_DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV,
		NEXT_PUBLIC_POSTHOG_TOKEN: process.env.NEXT_PUBLIC_POSTHOG_TOKEN,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
	},

	skipValidation: process.env.SKIP_ENV_CHECK === 'true',
});
