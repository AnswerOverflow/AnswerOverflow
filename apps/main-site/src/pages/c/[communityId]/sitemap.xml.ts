import type { GetServerSidePropsContext } from 'next';
import { findServerWithCommunityPageData } from '@answeroverflow/db';
// eslint-disable-next-line no-restricted-imports
import { Sitemap } from '../../../utils/sitemap';

// TODO: This needs to get chunked when its past 50,000 URLs
export async function getServerSideProps({
	res,
	params,
}: GetServerSidePropsContext) {
	const communityId = params?.communityId as string;
	const communityData = await findServerWithCommunityPageData({
		idOrVanityUrl: communityId,
	});
	const questions =
		communityData?.channels.flatMap((channel) => channel.questions) ?? [];
	const sitemap = new Sitemap(
		'https://www.answeroverflow.com',
		'url',
		questions.map(({ thread }) => ({
			loc: `/m/${thread.id}`,
			changefreq: thread.archivedTimestamp ? 'weekly' : 'daily',
			priority: 0.9,
		})),
	);
	sitemap.add({
		loc: `/c/${communityId}`, // Community page
		changefreq: 'weekly',
		priority: 1,
	});
	sitemap.applyToRes(res);
	res.end();

	return {
		props: {},
	};
}

export default getServerSideProps;
