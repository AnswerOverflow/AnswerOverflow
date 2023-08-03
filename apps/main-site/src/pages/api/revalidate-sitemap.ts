import { NextApiRequest, NextApiResponse } from 'next';
import Sitemapper from 'sitemapper';
import { webServerEnv } from '@answeroverflow/env/web';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (
		request.nextUrl.searchParams.get('secret') !==
		webServerEnv.REVALIDATE_SECRET
	) {
		return res.status(401).json({ message: 'Invalid token' });
	}
	// 1. invalidate the main sitemap index
	// 2. fetch the main sitemap index
	// 3. invalidate all the sitemaps in the main sitemap index
	// 4. fetch all the sitemaps in the main sitemap index
	// 5. submit the main sitemap index to google
	// 6. submit all the sitemaps in the main sitemap index to google
	// 7. return a 200 response
	revalidateT;
}
