import { sharedEnvs } from '@answeroverflow/env/shared';

export module AuthEdge {
	export function getNextAuthCookieName() {
		const cookiePrefix =
			sharedEnvs.NODE_ENV === 'production' ? '__Secure-' : ''!;
		return `${cookiePrefix}next-auth.session-token`;
	}
	export function getTenantCookieName() {
		return `${
			sharedEnvs.NODE_ENV === 'production' ? '__Host-' : '!'
		}answeroverflow.tenant-token`;
	}
}
