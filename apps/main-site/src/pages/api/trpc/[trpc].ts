import { createNextApiHandler } from '@trpc/server/adapters/next';
import { createContext } from '@answeroverflow/api';
import { appRouter } from '@answeroverflow/api';
import { finishAnalyticsCollection } from '@answeroverflow/analytics';
import type { NextApiRequest, NextApiResponse } from 'next/types';
import { prisma } from '@answeroverflow/db';
import {
	disableSettingNextAuthCookie,
	getNextAuthCookieName,
	getTenantCookieName,
} from '@answeroverflow/auth';
import { isOnMainSite } from '@answeroverflow/constants';
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
			res.end();
			return;
		}
	}
	const token = req.cookies[getTenantCookieName()];
	if (token) {
		const nextAuthSession = await prisma.tenantSession.findUnique({
			where: {
				id: token,
			},
		});
		// add a cookie to the request using the next auth header
		req.cookies[getNextAuthCookieName()] = nextAuthSession?.sessionToken;
	}
	if (!isOnMainSite(req.headers.host!)) {
		disableSettingNextAuthCookie(res);
	}
	// pass the (modified) req/res to the handler
	// weird type errors even though they're the same
	await nextApiHandler(req, res);
	await finishAnalyticsCollection();
}
