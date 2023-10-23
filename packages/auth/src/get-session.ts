import { getServerSession as getNextAuthSession } from 'next-auth';
import { cookies } from 'next/headers';

import { authOptions } from './auth-options';
import { getNextAuthCookieName, getTenantCookieName } from './tenant-cookie';
import { db, dbTenantSessions } from '@answeroverflow/db';
import { eq } from 'drizzle-orm';

export const getServerSession = async () => {
	const tenantToken = cookies().get(getTenantCookieName());
	if (tenantToken) {
		const nextAuthSession = await db.query.dbTenantSessions.findFirst({
			where: eq(dbTenantSessions.id, tenantToken.value),
		});
		if (!nextAuthSession) return null;
		const oldCookies = cookies().getAll();
		// hacky
		cookies().getAll = () => {
			return [
				...oldCookies,
				{ name: getNextAuthCookieName(), value: nextAuthSession.sessionToken },
			];
		};
	}
	// TODO: Does next auth early return if no auth cookie is set?
	const session = await getNextAuthSession(authOptions);
	if (!session) return null;
	return {
		...session,
		isTenantSession: !!tenantToken,
	};
};
