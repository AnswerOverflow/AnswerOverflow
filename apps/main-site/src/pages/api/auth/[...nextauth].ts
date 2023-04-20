import NextAuth from 'next-auth';
import { authOptions } from '@answeroverflow/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

// @see https://nextjs.org/docs/api-routes/introduction
export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	// Only enable CORS in development for accessing through Storybook
	if (process.env.NODE_ENV !== 'production') {
		// Modify `req` and `res` objects here
		// In this case, we are enabling CORS
		// TODO: Look up community tenant, if it exists, use it
		res.setHeader('Access-Control-Allow-Origin', 'http://tenant:3001');
		res.setHeader('Access-Control-Request-Method', '*');
		res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
		res.setHeader('Access-Control-Allow-Headers', 'content-type');
		res.setHeader('Referrer-Policy', 'no-referrer');
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		if (req.method === 'OPTIONS') {
			res.writeHead(200);
			return res.end();
		}
	}

	const auth = NextAuth(authOptions);

	const authRes = await auth(req, res);
	return authRes;
}
