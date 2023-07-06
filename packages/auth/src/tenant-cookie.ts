import { CookieSerializeOptions } from 'cookie';

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
		sameSite: 'lax',
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
