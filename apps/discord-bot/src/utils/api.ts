import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { botRouter } from '@answeroverflow/api';

createHTTPServer({
	router: botRouter,
	createContext() {
		return {};
	},
}).listen(2022);
