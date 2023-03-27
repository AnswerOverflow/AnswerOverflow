import type { NextApiRequest, NextApiResponse } from 'next';
// import * as request from 'request';
import fetch from 'node-fetch';

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
	// // const headersThatBreak = new Set(['transfer-encoding', 'content-encoding']);
	const body = JSON.parse(JSON.stringify(req.body));
	const proxyRes = await fetch(posthogEndpoint, {
		method: req.method,
		// @ts-ignore TODO: Revisit
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		body: body instanceof Object ? body.data : (body as string),
		redirect: 'follow',
	});
	res.status(proxyRes.status);
	proxyRes.headers.forEach((value, key) => {
		res.setHeader(key, value);
	});
	res.end(await proxyRes.text());
}
