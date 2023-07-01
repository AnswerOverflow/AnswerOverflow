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
	if (req.headers.host !== 'localhost:3000') {
		res.setHeader = () => res; // eslint-disable-line @typescript-eslint/no-empty-function
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	await NextAuth(req, res, authOptions);
}
