import type { GetServerSidePropsContext } from 'next';
import { findAllThreadsByParentId } from '@answeroverflow/db';
// eslint-disable-next-line no-restricted-imports
import { Sitemap } from '../../../../utils/sitemap';

export async function getServerSideProps({
	res,
	params,
}: GetServerSidePropsContext) {
	const channelId = params?.channelId as string;
	const channels = await findAllThreadsByParentId(channelId);

	const sitemap = new Sitemap(
		'https://www.answeroverflow.com',
		channels.map((thread) => ({
			loc: `/m/${thread.id}`,
			changefreq: 'monthly',
			priority: 0.7,
		})),
	);
	sitemap.applyToRes(res);
	res.end();

	return {
		props: {},
	};
}

export default getServerSideProps;
