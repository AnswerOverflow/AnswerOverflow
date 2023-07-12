import { CookieSerializeOptions } from 'cookie';
import { NextApiResponse } from 'next';

export function getTenantCookieName() {
	return `${
		process.env.NODE_ENV === 'production' ? '__Host-' : ''
	}answeroverflow.tenant-token`;
}

export function getTenantCookieOptions(
	override?: CookieSerializeOptions,
): CookieSerializeOptions {
	return {
		httpOnly: true,
		sameSite: 'strict',
		secure: process.env.NODE_ENV === 'production',
		expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 1 month
		domain: '',
		path: '/',
		...override,
	};
}

export function getNextAuthCookieName() {
	const cookiePrefix = process.env.NODE_ENV === 'production' ? '__Secure-' : '';
	return `${cookiePrefix}next-auth.session-token`;
}

export function disableSettingNextAuthCookie(res: NextApiResponse<any>) {
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const originalSetHeader = res.setHeader;
	res.setHeader = function (name, value) {
		if (name.toLowerCase() === 'set-cookie') {
			if (
				typeof value === 'string' &&
				value.startsWith(`${getNextAuthCookieName()}=`)
			) {
				return res;
			}
		}
		return originalSetHeader.call(this, name, value);
	};
}
