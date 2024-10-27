import * as Sentry from '@sentry/node';
import '@sentry/tracing';

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	tracesSampleRate: 0.1,
});

import { botRouter } from '@answeroverflow/api/src/bot';
import { SapphireClient } from '@sapphire/framework';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createClient, login } from './utils/bot';
// make TypeScript happy
declare global {
	var client: SapphireClient;
}

if (!global.client) {
	global.client = createClient();
	await login(global.client);

	createHTTPServer({
		router: botRouter,
		onError:
			process.env.NODE_ENV === 'development'
				? ({ path, error }) => {
						console.error(
							`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
						);
					}
				: undefined,
		createContext() {
			return {
				client: global.client,
			};
		},
	}).listen(2022);
} else {
	console.log('Reloading client');
}
