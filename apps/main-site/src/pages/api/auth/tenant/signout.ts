import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<any>,
) {
	// Clear the answeroverflow.tenant-token cookie
	res.setHeader(
		'Set-Cookie',
		'answeroverflow.tenant-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT',
	);
	res.status(200).json({ success: true });
}
