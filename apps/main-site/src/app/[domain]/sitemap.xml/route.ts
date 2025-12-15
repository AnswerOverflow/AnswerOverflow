import { Database } from "@packages/database/database";
import { normalizeSubpath } from "@packages/ui/utils/links";
import { Array as Arr, Effect } from "effect";
import { runtime } from "../../../lib/runtime";

type SitemapEntry = {
	loc: string;
	lastmod?: Date;
};

type PaginationState = {
	entries: SitemapEntry[];
	cursor: string | null;
	done: boolean;
};

const MAX_SITEMAP_ENTRIES = 50000;
const SITEMAP_BATCH_SIZE = 1000;

function generateSitemapXml(entries: SitemapEntry[], baseUrl: string): string {
	const urls = entries.map((entry) => {
		let data = "<url>";
		data += `<loc>${entry.loc.startsWith("http") ? entry.loc : baseUrl + entry.loc}</loc>`;
		if (entry.lastmod) {
			data += `<lastmod>${entry.lastmod.toISOString()}</lastmod>`;
		}
		data += "</url>";
		return data;
	});

	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}

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

	const result = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		if (!tenant?.server || !tenant?.preferences) {
			return null;
		}

		const subpath = normalizeSubpath(tenant.preferences.subpath);
		const baseUrl = `https://${domain}${subpath ? `/${subpath}` : ""}`;

		const initialState: PaginationState = {
			entries: [],
			cursor: null,
			done: false,
		};

		const finalState = yield* Effect.iterate(initialState, {
			while: (state) =>
				!state.done && state.entries.length < MAX_SITEMAP_ENTRIES,
			body: (state) =>
				Effect.gen(function* () {
					const threads = yield* database.public.channels.getServerPageThreads(
						{
							serverDiscordId: tenant.server.discordId,
							paginationOpts: {
								numItems: SITEMAP_BATCH_SIZE,
								cursor: state.cursor,
							},
						},
						{ subscribe: false },
					);

					const remainingSlots = MAX_SITEMAP_ENTRIES - state.entries.length;
					const newEntries = Arr.map(
						Arr.take(threads.page, remainingSlots),
						(thread) => ({
							loc: `/m/${thread.thread.id}`,
							lastmod: thread.thread._creationTime
								? new Date(thread.thread._creationTime)
								: undefined,
						}),
					);

					return {
						entries: [...state.entries, ...newEntries],
						cursor: threads.continueCursor,
						done: threads.isDone,
					};
				}),
		});

		return {
			baseUrl,
			entries: finalState.entries,
		};
	}).pipe(runtime.runPromise);

	if (!result) {
		return new Response("Not Found", { status: 404 });
	}

	const xml = generateSitemapXml(result.entries, result.baseUrl);

	return new Response(xml, {
		headers: {
			"Content-Type": "text/xml",
			"Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
			"CDN-Cache-Control": "max-age=43200",
			"Vercel-CDN-Cache-Control": "max-age=86400",
		},
		status: 200,
	});
}
