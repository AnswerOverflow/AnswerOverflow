import { ServerResponse } from 'http';
import {
	findQuestionsForSitemapCached,
	getDate,
} from '@answeroverflow/core/sitemap';
import { Sitemap } from '@answeroverflow/utils/sitemap';

export async function addCommunityQuestionsToSitemap(input: {
	communityId: string;
	sitemap: Sitemap;
}) {
	console.log(`Generating sitemap for community ${input.communityId}`);
	const lookup = await findQuestionsForSitemapCached(input.communityId);
	if (!lookup) return;
	const { questions, server } = lookup;

	let largestTimestamp = -1;
	input.sitemap.addMany(
		questions.map(({ thread }) => {
			if (
				thread.archivedTimestamp &&
				thread.archivedTimestamp > largestTimestamp
			)
				largestTimestamp = Number(thread.archivedTimestamp);
			return {
				loc: `/m/${thread.id}`,
				// We really don't expect archived threads to be updated
				priority: 0.9,
				lastmod: thread.archivedTimestamp
					? new Date(Number(thread.archivedTimestamp))
					: getDate(thread.id),
			};
		}),
	);

	// Only add community page to main sitemap if it doesn't have custom domain or subpath
	if (!server.customDomain && !server.subpath) {
		input.sitemap.add({
			loc: `/c/${input.communityId}`, // Community page
			lastmod: largestTimestamp === -1 ? undefined : new Date(largestTimestamp),
			priority: 1,
		});
	}
	console.log(`Finished generating sitemap for community ${input.communityId}`);
}

export async function generateCommunityPageSitemap(input: {
	communityId: string;
	res: ServerResponse;
	baseUrl: string;
}) {
	const sitemap = new Sitemap(input.baseUrl, 'url');
	await addCommunityQuestionsToSitemap({
		communityId: input.communityId,
		sitemap,
	});
	sitemap.applyToRes(input.res);
	input.res.end();
	return;
}
