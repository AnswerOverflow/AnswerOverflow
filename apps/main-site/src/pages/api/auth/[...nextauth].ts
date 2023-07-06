import NextAuth from 'next-auth';

import { authOptions, getNextAuthCookieName, getTenantCookieName } from '@answeroverflow/auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { findTenantSessionByToken } from '@answeroverflow/db';
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const token = req.cookies[getTenantCookieName()];
	if (token) {
		const nextAuthSession = await findTenantSessionByToken(token);
		// add a cookie to the request using the next auth header
		req.cookies[getNextAuthCookieName()] = nextAuthSession?.sessionToken;
	}
	if (req.headers.host !== 'localhost:3000') {
		res.setHeader = () => res; // eslint-disable-line @typescript-eslint/no-empty-function
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	await NextAuth(req, res, authOptions);
}
