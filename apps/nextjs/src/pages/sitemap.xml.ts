import type { GetServerSidePropsContext } from 'next';
import { findAllServers } from '@answeroverflow/db';
import { Sitemap } from '../utils/sitemap';

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
	const servers = await findAllServers();
	const sitemap = new Sitemap(
		'https://www.answeroverflow.com',
		servers.map((server) => ({
			loc: `/c/${server.id}/sitemap.xml`,
			changefreq: 'weekly',
			priority: 1,
		})),
	);
	sitemap.applyToRes(res);
	res.end();

	return {
		props: {},
	};
}

export default getServerSideProps;
