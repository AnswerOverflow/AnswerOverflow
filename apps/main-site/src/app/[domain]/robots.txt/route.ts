export const runtime = 'edge';
export function GET(
	_req: Request,
	{
		params,
	}: {
		params: {
			domain: string;
		};
	},
) {
	const domain = params.domain;
	return new Response(
		`User-agent: *
Allow: /
Allow: /api/og/
Disallow: /api/
Disallow: /dashboard/
Disallow: /oemf7z50uh7w/
Disallow: /ingest/
Sitemap: https://${domain}/sitemap.xml
`,
		{
			headers: {
				'content-type': 'text/plain',
				// client cache for 12 hours
				'Cache-Control': 'max-age=43200',
				// downstream cache for 12 hours
				'CDN-Cache-Control': 'max-age=43200',
				// downstream cache for 24 hours
				'Vercel-CDN-Cache-Control': 'max-age=86400',
			},
			status: 200,
		},
	);
}
