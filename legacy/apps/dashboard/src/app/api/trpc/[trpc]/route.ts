import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '@answeroverflow/api';

const handler = (req: Request) =>
	fetchRequestHandler({
		req,
		router: appRouter,
		endpoint: '/api/trpc',
		createContext: createContext,
	});

export { handler as GET, handler as POST };
