import { getServerSession as getNextAuthSession } from 'next-auth';
import { cookies } from 'next/headers';

import { authOptions } from './auth-options';
import { getTenantCookieName } from './tenant-cookie';

export const getServerSession = async () => {
	const isTenantSession = cookies().has(getTenantCookieName());
	const session = await getNextAuthSession(authOptions);
	if (!session) return null;
	return {
		...session,
		isTenantSession,
	};
};
