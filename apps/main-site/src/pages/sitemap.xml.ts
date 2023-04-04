import type { GetServerSidePropsContext } from 'next';
import { findAllServers } from '@answeroverflow/db';
import { Sitemap } from '../utils/sitemap';
// sitemap.add(
//   {
//     loc: '/',
//     changefreq: 'weekly',
//     priority: 1,
//     type: 'url',
//   },
//   {
//     loc: '/pricing',
//     changefreq: 'weekly',
//     priority: 1,
//     type: 'url',
//   },
//   {
//     loc: '/tos',
//     changefreq: 'monthly',
//     priority: 0.5,
//     type: 'url',
//   },
//   {
//     loc: '/privacy',
//     changefreq: 'monthly',
//     priority: 0.5,
//     type: 'url',
//   },
//   {
//     loc: '/cookies',
//     changefreq: 'monthly',
//     priority: 0.5,
//     type: 'url',
//   },
//   {
//     loc: '/eula',
//     changefreq: 'monthly',
//     priority: 0.5,
//     type: 'url',
//   },
// );
export async function getServerSideProps({ res }: GetServerSidePropsContext) {
	const servers = await findAllServers();
	const sitemap = new Sitemap(
		'https://www.answeroverflow.com',
		'sitemap',
		servers.map((server) => ({
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
