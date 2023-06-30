import NextAuth from 'next-auth';

import { authOptions } from '@answeroverflow/auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@answeroverflow/db';
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	// Check if the answeroverflow.tenant-token cookie exists
	const token = req.cookies['answeroverflow.tenant-token'];
	if (token) {
		const nextAuthSession = await prisma.tenantSession.findUnique({
			where: {
				id: token,
			},
		});
		// add a cookie to the request using the next auth header
		req.cookies['next-auth.session-token'] = nextAuthSession?.sessionToken;
	}
	const oldSend = res.send;
	res.send = (data) => {
		// remove the next-auth.session-token cookie from the response if it's a tenant session
		if (req.headers.host !== 'localhost:3000') {
			res.setHeader(
				'Set-Cookie',
				'next-auth.session-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
			);
		}
		return oldSend(data);
	};
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	await NextAuth(req, res, authOptions);
}
