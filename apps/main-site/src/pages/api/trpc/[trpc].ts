import { createNextApiHandler } from '@trpc/server/adapters/next';
import { createContext } from '@answeroverflow/api';
import { appRouter } from '@answeroverflow/api';
import { finishAnalyticsCollection } from '@answeroverflow/analytics';
import type { NextApiRequest, NextApiResponse } from 'next/types';
import { db } from '@answeroverflow/db';
import {
	disableSettingCookies,
	getNextAuthCookieName,
	getTenantCookieName,
} from '@answeroverflow/auth';
import { isOnMainSite } from '@answeroverflow/constants';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { eq } from 'drizzle-orm';
import { tenantSessions } from '@answeroverflow/db/src/schema';
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
	if (sharedEnvs.NODE_ENV !== 'production') {
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
		const nextAuthSession = await db.query.tenantSessions.findFirst({
			where: eq(tenantSessions.id, token),
		});
		// add a cookie to the request using the next auth header
		req.cookies[getNextAuthCookieName()] = nextAuthSession?.sessionToken;
	}
	if (!isOnMainSite(req.headers.host!)) {
		disableSettingCookies(res);
	}
	// pass the (modified) req/res to the handler
	// weird type errors even though they're the same
	await nextApiHandler(req, res);
	await finishAnalyticsCollection();
}
