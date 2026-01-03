import { Database } from "@packages/database/database";
import { normalizeSubpath } from "@packages/ui/utils/links";
import { Sitemap } from "@packages/ui/utils/sitemap";
import { getDate } from "@packages/ui/utils/snowflake";
import { Array as Arr, Effect } from "effect";
import { runtime } from "../../../../lib/runtime";

export const maxDuration = 300;

const MAX_SITEMAP_ENTRIES = 50000;
const SITEMAP_BATCH_SIZE = 200;

type PaginationState = {
	sitemap: Sitemap;
	cursor: string | null;
	done: boolean;
};

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
		const tenant = yield* database.public.servers.getServerByDomain({
			domain,
		});
		if (!tenant?.server || !tenant?.preferences) {
			return null;
		}

		const subpath = normalizeSubpath(tenant.preferences.subpath);
		const baseUrl = `https://${domain}${subpath ? `/${subpath}` : ""}`;

		const initialState: PaginationState = {
			sitemap: new Sitemap(baseUrl, "url"),
			cursor: null,
			done: false,
		};

		const finalState = yield* Effect.iterate(initialState, {
			while: (state) =>
				!state.done && state.sitemap.entries.length < MAX_SITEMAP_ENTRIES,
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

					const remainingSlots =
						MAX_SITEMAP_ENTRIES - state.sitemap.entries.length;

					state.sitemap.addMany(
						Arr.map(Arr.take(threads.page, remainingSlots), (thread) => ({
							loc: `/m/${thread.thread.id}`,
							lastmod: thread.thread.archivedTimestamp
								? new Date(thread.thread.archivedTimestamp)
								: getDate(thread.thread.id),
							priority: 0.9,
						})),
					);

					return {
						sitemap: state.sitemap,
						cursor: threads.continueCursor,
						done: threads.isDone,
					};
				}),
		});

		return finalState.sitemap;
	}).pipe(runtime.runPromise);

	if (!result) {
		return new Response("Not Found", { status: 404 });
	}

	return result.toResponse();
}
