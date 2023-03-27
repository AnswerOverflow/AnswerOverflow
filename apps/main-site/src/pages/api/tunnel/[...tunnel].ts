import type { NextApiRequest, NextApiResponse } from 'next';
import getRawBody from 'raw-body';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const { tunnel, ...queries } = req.query;
	const query = Object.entries(queries)
		.map(([key, value]) => {
			if (Array.isArray(value)) {
				return value
					.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
					.join('&');
			}
			if (typeof value === 'string')
				return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
			return '';
		})
		.join('&');

	const posthogEndpoint = `https://app.posthog.com/${
		tunnel as string
	}?${query}`;

	const headersToFilter = new Set(['host', 'cookie']);
	const filteredHeaders = Object.entries(req.headers).filter(
		([key]) => !headersToFilter.has(key),
	);

	const rawBody = await getRawBody(req);
	const proxyRes = await fetch(posthogEndpoint, {
		method: req.method,
		body: rawBody,
		redirect: 'follow',
		// @ts-ignore TODO: Revisit
		headers: filteredHeaders,
	});

	res.status(proxyRes.status);
	proxyRes.headers.forEach((value, key) => {
		res.setHeader(key, value);
	});
	res.end(await proxyRes.text());
}

export const config = {
	api: {
		bodyParser: false,
	},
};
