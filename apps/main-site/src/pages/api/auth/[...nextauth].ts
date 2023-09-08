import NextAuth from 'next-auth';

import {
	authOptions,
	disableSettingCookies,
	getNextAuthCookieName,
	getTenantCookieName,
} from '@answeroverflow/auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { findTenantSessionByToken } from '@answeroverflow/db';
import { isOnMainSite } from '@answeroverflow/constants/src/links';
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const token = req.cookies[getTenantCookieName()];
	if (token) {
		const nextAuthSession = await findTenantSessionByToken(token);
		// add a cookie to the request using the next auth header
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		req.cookies[getNextAuthCookieName()] = nextAuthSession?.sessionToken;
	}
	if (!isOnMainSite(req.headers.host!)) {
		disableSettingCookies(res);
	}
	await NextAuth(req, res, authOptions);
}
