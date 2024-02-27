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
Sitemap: https://${domain}/sitemap.xml
`,
		{
			headers: {
				'content-type': 'text/plain',
			},
			status: 200,
		},
	);
}
