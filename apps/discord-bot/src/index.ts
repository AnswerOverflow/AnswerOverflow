/* eslint-disable @typescript-eslint/naming-convention */
import * as Sentry from '@sentry/node';

// Importing @sentry/tracing patches the global hub for tracing to work.
import '@sentry/tracing';

Sentry.init({
	dsn: process.env.SENTRY_DSN,

	// Set tracesSampleRate to 1.0 to capture 100%
	// of transactions for performance monitoring.
	// We recommend adjusting this value in production
	tracesSampleRate: 0.1,
});

import type { DiscordJSReact } from '@answeroverflow/discordjs-react';
import type LRUCache from 'lru-cache';
import { createClient, login } from './utils/bot';

const client = createClient();
void login(client);

declare module '@sapphire/pieces' {
	interface Container {
		discordJSReact: DiscordJSReact;
		messageHistory: LRUCache<
			string,
			{
				history: React.ReactNode[];
				setHistory: (node: React.ReactNode[]) => void;
			}
		>;
	}
}

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			/* Discord Bot */
			DISCORD_TOKEN: string;
			SENTRY_DSN: string | undefined;
			INDEXING_INTERVAL_IN_HOURS: string | undefined;
			MAXIMUM_CHANNEL_MESSAGES_PER_INDEX: string | undefined;
			BOT_DEV_LOG_LEVEL: string | undefined;
			BOT_TEST_LOG_LEVEL: string | undefined;
			BOT_PROD_LOG_LEVEL: string | undefined;
		}
	}
}
