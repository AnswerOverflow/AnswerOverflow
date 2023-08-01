import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { Sitemap } from './sitemap';
import { ServerResponse } from 'http';

export async function generateCommunityPageSitemap(input: {
	communityId: string;
	res: ServerResponse;
	baseUrl: string;
}) {
	const communityData = await findServerWithCommunityPageData({
		idOrVanityUrl: input.communityId,
	});
	const questions =
		communityData?.channels.flatMap((channel) => channel.questions) ?? [];
	const sitemap = new Sitemap(
		input.baseUrl,
		'url',
		questions.map(({ thread }) => ({
			loc: `/m/${thread.id}`,
			changefreq: thread.archivedTimestamp ? 'weekly' : 'daily',
			priority: 0.9,
		})),
	);
	if (communityData && !communityData.server.customDomain) {
		sitemap.add({
			loc: `/c/${input.communityId}`, // Community page
			changefreq: 'weekly',
			priority: 1,
		});
	}
	sitemap.applyToRes(input.res);
	input.res.end();
	return;
}
