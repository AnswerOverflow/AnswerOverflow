import type { NextApiRequest, NextApiResponse } from 'next';
import { getCsrfToken, getSession } from 'next-auth/react';
import { db } from '@answeroverflow/db';
import { z } from 'zod';
// eslint-disable-next-line no-restricted-imports
import { init } from '../../../../../node_modules/next-auth/core/init';
// eslint-disable-next-line no-restricted-imports
import getAuthorizationUrl from '../../../../../node_modules/next-auth/core/lib/oauth/authorization-url';
// eslint-disable-next-line no-restricted-imports
import { setCookie } from '../../../../../node_modules/next-auth/next/utils';
import { authOptions, getNextAuthCookieName } from '@answeroverflow/auth';
import { IncomingMessage } from 'http';
import { NextAuthOptions } from 'next-auth';
import { NextApiRequestCookies } from 'next/dist/server/api-utils';
import { findServerByCustomDomain } from '@answeroverflow/db/src/server';
import { dbTenantSessions } from '@answeroverflow/db/src/schema';
import { randomUUID } from 'node:crypto';

async function getServerSignInUrl(
	req: IncomingMessage,
	cookies: NextApiRequestCookies,
	authOptions: NextAuthOptions,
) {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { options, cookies: initCookies } = await init({
		action: 'signin',
		authOptions,
		isPost: true,
		providerId: 'discord',
		cookies,
		csrfToken: await getCsrfToken({ req }),
		callbackUrl: req.url,
	});
	const { redirect, cookies: authCookies } = await getAuthorizationUrl({
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		options,
		query: {},
	});
	return {
		redirect,
		// @ts-expect-error
		cookies: [...initCookies, ...authCookies],
	};
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const redirect = z
		.string()
		.url()
		.parse(decodeURIComponent(req.query.redirect as string));
	const redirectURL = new URL(redirect);

	const session = await getSession({ req });
	const token = req.cookies[getNextAuthCookieName()] as string;

	if (!session || !token) {
		const redirect = await getServerSignInUrl(
			req,
			req.cookies,
			authOptions, // your authOptions
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		redirect.cookies?.forEach((cookie) => setCookie(res, cookie));
		res.writeHead(302, { Location: redirect.redirect });
		res.end();
		return;
	}

	const tenant = await findServerByCustomDomain(redirectURL.host);
	if (!tenant) {
		res.status(404).json({ error: 'Tenant not found' });
		return;
	}

	const tenantSessionId = randomUUID();

	await db.insert(dbTenantSessions).values({
		id: tenantSessionId,
		serverId: tenant.id,
		sessionToken: token,
	});

	const redirectWithToken = `${redirectURL.origin}/api/auth/tenant/callback?redirect=${redirect}&code=${tenantSessionId}`;

	res.redirect(redirectWithToken);
	return;
}
