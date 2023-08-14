import type { GetServerSidePropsContext } from 'next';
import { findAllServers } from '@answeroverflow/db';
import { Sitemap } from '../utils/sitemap';
import { addCommunityQuestionsToSitemap } from '../utils/community-page';
import { trackServerSideEvent } from '@answeroverflow/analytics';

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
	const servers = await findAllServers();
	const activeCommunities = servers.filter(
		(x) => !x.customDomain && x.kickedTime === null,
	);
	const sitemap = new Sitemap('https://www.answeroverflow.com', 'url');

	// TODO: Needs optimization but it's cached and only runs once a day
	const chunkSize = 50;
	const chunks: string[][] = [];
	for (let i = 0; i < activeCommunities.length; i += chunkSize) {
		chunks.push(activeCommunities.slice(i, i + chunkSize).map((x) => x.id));
	}
	for await (const chunk of chunks) {
		await Promise.all(
			chunk.map((x) =>
				addCommunityQuestionsToSitemap({
					sitemap,
					communityId: x,
				}),
			),
		);
	}
	try {
		trackServerSideEvent('Sitemap Generated', {
			'Answer Overflow Account Id': 'server-web',
			'Number of Communities': activeCommunities.length,
			'Number of Entries': sitemap.entries.length,
			'Number of Questions': sitemap.entries.length - activeCommunities.length,
		});
	} catch {
		// ignore
	}
	sitemap.applyToRes(res);

	return {
		props: {},
	};
}

export default getServerSideProps;
