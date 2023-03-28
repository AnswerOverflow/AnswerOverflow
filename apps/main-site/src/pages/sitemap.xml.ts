import type { GetServerSidePropsContext } from 'next';
import { findAllServers } from '@answeroverflow/db';
import { Sitemap } from '../utils/sitemap';

export async function getServerSideProps({ res }: GetServerSidePropsContext) {
	const servers = await findAllServers();
	const sitemap = new Sitemap(
		'https://www.answeroverflow.com',
		servers.map((server) => ({
			loc: `/c/${server.id}/sitemap.xml`,
			changefreq: 'daily',
			priority: 1,
		})),
	);
	sitemap.add(
		{
			loc: '/',
			changefreq: 'weekly',
			priority: 1,
		},
		{
			loc: '/pricing',
			changefreq: 'weekly',
			priority: 1,
		},
		{
			loc: '/tos',
			changefreq: 'monthly',
			priority: 0.5,
		},
		{
			loc: '/privacy',
			changefreq: 'monthly',
			priority: 0.5,
		},
		{
			loc: '/cookies',
			changefreq: 'monthly',
			priority: 0.5,
		},
		{
			loc: '/eula',
			changefreq: 'monthly',
			priority: 0.5,
		},
	);
	sitemap.applyToRes(res);
	res.end();

	return {
		props: {},
	};
}

export default getServerSideProps;
