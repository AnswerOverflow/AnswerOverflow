import { botRouter } from '@answeroverflow/api/src/bot';
import { SapphireClient } from '@sapphire/framework';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createClient, login } from './utils/bot';
// make TypeScript happy
declare global {
	var client: SapphireClient;
}

const port = parseInt(process.env.PORT ?? '2022');

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
	}).listen(port);
} else {
	console.log('Reloading client');
}
