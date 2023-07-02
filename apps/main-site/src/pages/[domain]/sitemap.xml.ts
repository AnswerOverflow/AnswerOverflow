import type { GetServerSidePropsContext } from 'next';
import { findServerByCustomDomain } from '@answeroverflow/db';
// eslint-disable-next-line no-restricted-imports
import { generateCommunityPageSitemap } from '../../utils/community-page';

export async function getServerSideProps({
	res,
	query,
}: GetServerSidePropsContext<{
	domain: string;
}>) {
	const domain = query.domain;
	if (typeof domain !== 'string')
		throw new Error('domain must be a string' + ' but got ' + typeof domain);
	const server = await findServerByCustomDomain(domain);
	if (!server) {
		res.statusCode = 404;
		res.end();
		return {
			props: {},
		};
	}
	await generateCommunityPageSitemap({
		baseUrl: `https://${domain}`,
		communityId: server.id,
		res,
	});

	return {
		props: {},
	};
}

export default getServerSideProps;
