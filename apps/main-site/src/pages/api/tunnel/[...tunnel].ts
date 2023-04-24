import type { NextApiRequest, NextApiResponse } from 'next';
import getRawBody from 'raw-body';
import nodeFetch, { type RequestInit } from 'node-fetch';

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

	const targetUrl = tunnel instanceof Array ? tunnel.join('/') : tunnel;
	const posthogEndpoint = `https://app.posthog.com/${targetUrl ?? ''}?${query}`;

	const headersToFilter = new Set(['host', 'cookie']);
	const filteredHeaders = Object.entries(req.headers).filter(
		([key]) => !headersToFilter.has(key),
	);

	const rawBody = await getRawBody(req);
	const requestInit: RequestInit = {
		method: req.method,
		redirect: 'follow',
		// @ts-ignore TODO: Revisit
		headers: filteredHeaders,
	};
	if (req.method !== 'GET') {
		requestInit.body = rawBody;
	}
	const proxyRes = await nodeFetch(posthogEndpoint, requestInit);

	res.status(proxyRes.status);

	res.end(await proxyRes.text());
}

export const config = {
	api: {
		bodyParser: false,
	},
};
