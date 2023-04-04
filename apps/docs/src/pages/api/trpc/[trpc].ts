import { createNextApiHandler } from '@trpc/server/adapters/next';
import { createContext } from '@answeroverflow/api';
import { appRouter } from '@answeroverflow/api';
import type { NextApiRequest, NextApiResponse } from 'next';

// create the API handler, but don't return it yet
const nextApiHandler = createNextApiHandler({
	router: appRouter,
	createContext,
});

// @see https://nextjs.org/docs/api-routes/introduction
export default function handler(req: NextApiRequest, res: NextApiResponse) {
	// Only enable CORS in development for accessing through Storybook
	if (process.env.NODE_ENV !== 'production') {
		// Modify `req` and `res` objects here
		// In this case, we are enabling CORS
		res.setHeader('Access-Control-Allow-Origin', 'http://localhost:6006');
		res.setHeader('Access-Control-Request-Method', '*');
		res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
		res.setHeader('Access-Control-Allow-Headers', 'content-type');
		res.setHeader('Referrer-Policy', 'no-referrer');
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		if (req.method === 'OPTIONS') {
			res.writeHead(200);
			return res.end();
		}
	}

	// pass the (modified) req/res to the handler
	return nextApiHandler(req, res);
}
