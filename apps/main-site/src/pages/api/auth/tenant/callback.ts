import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	const redirect = (req.query.redirect as string) ?? '/';
	// ?code=...
	const token = req.query.code;
	if (!token) {
		return res.status(400);
	}
	// set the answeroverflow.tenant.token cookie
	res.setHeader(
		'Set-Cookie',
		`answeroverflow.tenant-token=${
			token as string
		}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
	);
	// redirect to the original redirect
	return res.redirect(redirect);
}
