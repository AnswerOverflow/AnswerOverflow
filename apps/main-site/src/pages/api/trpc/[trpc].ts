import { createNextApiHandler } from '@trpc/server/adapters/next';
import { createContext } from '@answeroverflow/api';
import { appRouter } from '@answeroverflow/api';
import { finishAnalyticsCollection } from '@answeroverflow/analytics';
import type { NextApiRequest, NextApiResponse } from 'next/types';
import { prisma } from '@answeroverflow/db';
// create the API handler, but don't return it yet
const nextApiHandler = createNextApiHandler({
	router: appRouter,
	createContext,
});

// @see https://nextjs.org/docs/api-routes/introduction
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
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
	const token = req.cookies['answeroverflow.tenant-token'];
	if (token) {
		const nextAuthSession = await prisma.tenantSession.findUnique({
			where: {
				id: token,
			},
		});
		// add a cookie to the request using the next auth header
		req.cookies['next-auth.session-token'] = nextAuthSession?.sessionToken;
	}
	if (req.headers.host !== 'localhost:3000') {
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const oldSetHeader = res.setHeader;
		res.setHeader = (key, value) => {
			if (key.toLowerCase() === 'set-cookie') return res;
			return oldSetHeader(key, value);
		}; // eslint-disable-line @typescript-eslint/no-empty-function
	}
	// pass the (modified) req/res to the handler
	// weird type errors even though they're the same
	// @ts-expect-error
	const trpcOutput = await nextApiHandler(req, res);

	await finishAnalyticsCollection();
	return trpcOutput;
}
