// eslint-disable-next-line n/no-extraneous-import
import { CookieSerializeOptions } from 'cookie';
import { NextApiResponse } from 'next';
import { sharedEnvs } from '@answeroverflow/env/shared';

export function getTenantCookieName() {
	return `${
		sharedEnvs.NODE_ENV === 'production' ? '__Host-' : ''
	}answeroverflow.tenant-token`;
}

export function getTenantCookieOptions(
	override?: CookieSerializeOptions,
): CookieSerializeOptions {
	return {
		httpOnly: true,
		sameSite: 'strict',
		secure: sharedEnvs.NODE_ENV === 'production',
		expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 1 month
		domain: '',
		path: '/',
		...override,
	};
}

export function getNextAuthCookieName() {
	const cookiePrefix = sharedEnvs.NODE_ENV === 'production' ? '__Secure-' : '';
	return `${cookiePrefix}next-auth.session-token`;
}

export function disableSettingCookies(res: NextApiResponse<any>) {
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const originalSetHeader = res.setHeader;
	res.setHeader = function (name, value) {
		if (name.toLowerCase() === 'set-cookie') {
			return res; // tenant sites don't need to set cookies
		} else {
			return originalSetHeader.call(this, name, value);
		}
	};
}
