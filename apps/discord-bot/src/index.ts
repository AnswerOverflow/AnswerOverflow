import { botRouter } from '@answeroverflow/api/bot/index';
import { SapphireClient } from '@sapphire/framework';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { createClient, login } from './utils/bot';
// make TypeScript happy
declare global {
	var client: SapphireClient;
}

// keep the bot running
process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
});

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
		createContext(ctx) {
			return {
				client: global.client,
				token: ctx.req.headers.authorization?.split(' ')[1],
			};
		},
	}).listen(port);
} else {
	console.log('Reloading client');
}
