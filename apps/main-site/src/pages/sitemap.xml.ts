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
	const sitemap = new Sitemap('https://answeroverflow.com', 'url');

	// TODO: Needs optimization but it's cached and only runs once a day
	await Promise.all(
		activeCommunities.map(async (community) =>
			addCommunityQuestionsToSitemap({
				sitemap,
				communityId: community.id,
			}),
		),
	);
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
