import type { NextApiRequest, NextApiResponse } from 'next';
// eslint-disable-next-line no-restricted-imports
import { setCookie } from '../../../../../../../node_modules/next-auth/next/utils';
import {
	getTenantCookieName,
	getTenantCookieOptions,
} from '@answeroverflow/auth';

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const redirect = (req.query.redirect as string) ?? '/';
	// ?code=...
	const token = req.query.code;
	if (!token) {
		return res.status(400);
	}
	// set the answeroverflow.tenant.token cookie
	setCookie(res, {
		name: getTenantCookieName(),
		options: getTenantCookieOptions(),
		value: token as string,
	});
	console.log(
		'Setting cookie',
		token,
		getTenantCookieName(),
		getTenantCookieOptions(),
	);
	// redirect to the original redirect
	res.redirect(redirect);
	return;
}
