import { botRouter } from '@answeroverflow/api/src/bot';
import { createHTTPServer } from '@trpc/server/adapters/standalone';

createHTTPServer({
	router: botRouter,
	createContext() {
		return {};
	},
}).listen(2022);
