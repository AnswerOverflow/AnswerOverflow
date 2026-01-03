import { Database } from "@packages/database/database";
import { normalizeSubpath } from "@packages/ui/utils/links";
import { Effect } from "effect";
import { runtime } from "../../../../lib/runtime";

export async function GET(
	_req: Request,
	props: {
		params: Promise<{
			domain: string;
		}>;
	},
) {
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	const tenantData = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.public.servers.getServerByDomain({
			domain,
		});
		if (!tenant?.server || !tenant?.preferences) {
			return null;
		}
		return {
			...tenant.server,
			...tenant.preferences,
		};
	}).pipe(runtime.runPromise);

	if (!tenantData) {
		return new Response("Not Found", { status: 404 });
	}

	const subpath = normalizeSubpath(tenantData.subpath);
	const sitemapUrl = `https://${domain}${subpath ? `/${subpath}` : ""}/sitemap.xml`;

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
Sitemap: ${sitemapUrl}
`,
		{
			headers: {
				"content-type": "text/plain",
				"Cache-Control": "max-age=43200",
				"CDN-Cache-Control": "max-age=43200",
				"Vercel-CDN-Cache-Control": "max-age=86400",
			},
			status: 200,
		},
	);
}
