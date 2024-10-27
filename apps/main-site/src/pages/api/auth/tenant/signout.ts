import { Auth } from '@answeroverflow/core/auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { setCookie } from '../../../../../../../node_modules/next-auth/next/utils';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const redirect = z
		.string()
		.url()
		.parse(decodeURIComponent(req.query.redirect as string));
	const authCookie = req.cookies[Auth.getTenantCookieName()];
	if (!authCookie) {
		res.status(201);
		res.end();
		return;
	}
	await Auth.deleteTenantSessionByToken(authCookie);
	setCookie(res, {
		name: Auth.getTenantCookieName(),
		value: '',
		options: Auth.getTenantCookieOptions({
			expires: new Date(0),
		}),
	});
	res.redirect(redirect);
	res.end();
}
