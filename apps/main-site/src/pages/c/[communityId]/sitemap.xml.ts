import type { GetServerSidePropsContext } from 'next';
import { findAllChannelsByServerId } from '@answeroverflow/db';
// eslint-disable-next-line no-restricted-imports
import { Sitemap } from '../../../utils/sitemap';

export async function getServerSideProps({
	res,
	params,
}: GetServerSidePropsContext) {
	const communityId = params?.communityId as string;
	const channels = await findAllChannelsByServerId(communityId);
	const channelsWithIndexingEnabled = channels.filter(
		(channel) => channel.flags.indexingEnabled,
	);

	const sitemap = new Sitemap(
		'https://www.answeroverflow.com',
		'sitemap',
		channelsWithIndexingEnabled.map((channel) => ({
			loc: `/c/${communityId}/${channel.id}/sitemap.xml`,
			changefreq: 'daily',
			priority: 0.9,
		})),
	);

	sitemap.applyToRes(res);
	res.end();

	return {
		props: {},
	};
}

export default getServerSideProps;
