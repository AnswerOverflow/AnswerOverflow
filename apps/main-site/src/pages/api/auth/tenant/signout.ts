import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteTenantSessionByToken } from 'packages/db';
// eslint-disable-next-line no-restricted-imports
import { setCookie } from '../../../../../../../node_modules/next-auth/next/utils';
import {
	getTenantCookieName,
	getTenantCookieOptions,
} from '@answeroverflow/auth';
import { z } from 'zod';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const redirect = z
		.string()
		.url()
		.parse(decodeURIComponent(req.query.redirect as string));
	const authCookie = req.cookies[getTenantCookieName()];
	if (!authCookie) {
		res.status(201);
		res.end();
		return;
	}
	await deleteTenantSessionByToken(authCookie);
	setCookie(res, {
		name: getTenantCookieName(),
		value: '',
		options: getTenantCookieOptions({
			expires: new Date(0),
		}),
	});
	res.redirect(redirect);
	res.end();
}
