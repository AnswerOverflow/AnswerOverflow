import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const redirect = req.query.redirect as string;
	const session = await getSession({ req });
	const token = req.cookies['next-auth.session-token'] as string;
	if (!session || !token) {
		return res.redirect(`/tenant-auth?redirect=${redirect}`);
	}

	// add token to redirect
	const redirectWithToken = `${redirect}?token=${token}`;
	return res.redirect(redirectWithToken);
}
