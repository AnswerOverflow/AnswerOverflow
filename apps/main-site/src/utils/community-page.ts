import { findQuestionsForSitemap } from '@answeroverflow/db';
import { Sitemap } from './sitemap';
import { ServerResponse } from 'http';

export async function addCommunityQuestionsToSitemap(input: {
	communityId: string;
	sitemap: Sitemap;
}) {
	console.log(`Generating sitemap for community ${input.communityId}`);
	const lookup = await findQuestionsForSitemap(input.communityId);
	if (!lookup) return;
	const { questions, server } = lookup;

	input.sitemap.addMany(
		questions.map(({ thread }) => ({
			loc: `/m/${thread.id}`,
			changefreq: thread.archivedTimestamp ? 'weekly' : 'daily',
			priority: 0.9,
		})),
	);
	if (!server.customDomain) {
		input.sitemap.add({
			loc: `/c/${input.communityId}`, // Community page
			changefreq: 'weekly',
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
