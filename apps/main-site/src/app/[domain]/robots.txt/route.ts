export const runtime = 'edge';
export async function GET(
	_req: Request,
	props: {
		params: Promise<{
			domain: string;
		}>;
	},
) {
	const params = await props.params;
	const domain = params.domain;
	return new Response(
		`User-agent: 008
Disallow: /

User-agent: voltron
Disallow: /

User-Agent: bender
Disallow: /my_shiny_metal_ass

User-Agent: Gort
Disallow: /earth

User-agent: MJ12bot
Disallow: /

User-agent: PiplBot
Disallow: /

User-agent: mauibot
Disallow: /

User-agent: semrushbot
Disallow: /

User-agent: ahrefsbot
Disallow: /


User-agent: blexbot
Disallow: /

User-agent: seo spider
Disallow: /

User-agent: *
Allow: /
Allow: /api/og/
Disallow: /api/
Disallow: /dashboard/
Disallow: /oemf7z50uh7w/
Disallow: /ingest/
Disallow: /u/
Disallow: /*/u/
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
