import type { GetServerSidePropsContext } from 'next';
import { findAllServers } from '@answeroverflow/db';
import { Sitemap } from '../utils/sitemap';

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
	const servers = await findAllServers();
	const sitemap = new Sitemap(
		'https://www.answeroverflow.com',
		'sitemap',
		servers
			.filter((x) => x.customDomain === null && x.kickedTime === null)
			.map((server) => ({
				loc: `/c/${server.id}/sitemap.xml`,
			})),
	);
	sitemap.applyToRes(res);
	res.end();

	return {
		props: {},
	};
}

export default getServerSideProps;
