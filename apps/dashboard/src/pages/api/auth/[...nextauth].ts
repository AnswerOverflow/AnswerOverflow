import NextAuth, { type AuthOptions } from 'next-auth';

import { isOnMainSite } from '@answeroverflow/constants/links';
import { Auth } from '@answeroverflow/core/auth';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const token = req.cookies[Auth.getTenantCookieName()];
	if (token) {
		const nextAuthSession = await Auth.findTenantSessionByToken(token);
		// add a cookie to the request using the next auth header
		req.cookies[Auth.getNextAuthCookieName()] = nextAuthSession?.sessionToken;
	}
	if (!isOnMainSite(req.headers.host!)) {
		Auth.disableSettingCookies(res);
	}
	// Type assertion needed due to multiple next-auth versions in node_modules
	await NextAuth(req, res, Auth.authOptions as AuthOptions);
}
