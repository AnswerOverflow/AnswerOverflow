import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { findServerById, prisma } from '@answeroverflow/db';
import { z } from 'zod';
import crypto from 'crypto';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const redirect = z.string().url().parse(req.query.redirect);
	const redirectURL = new URL(redirect);

	console.log(redirectURL, redirectURL.host);
	const session = await getSession({ req });
	const token = req.cookies['next-auth.session-token'] as string;
	if (!session || !token) {
		return res.redirect(`/tenant-auth?redirect=${redirect}`);
	}

	const tenant = await findServerById('1037547185492996207'); // TODO: Replace by using URL
	if (!tenant) {
		return res.status(404).json({ error: 'Tenant not found' });
	}
	const tenantSession = await prisma.tenantSession.create({
		data: {
			id: crypto.randomUUID(),
			serverId: tenant.id,
			sessionToken: token,
		},
	});
	const tenantSessionId = tenantSession.id;
	// add token to redirect

	const redirectWithToken = `${redirectURL.origin}/api/auth/tenant/callback?redirect=${redirect}&code=${tenantSessionId}`;
	console.log(redirectWithToken);

	return res.redirect(redirectWithToken);
}
