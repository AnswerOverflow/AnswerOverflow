import { findServerById } from '@answeroverflow/core/server';
import type { GetServerSidePropsContext } from 'next';
import { generateCommunityPageSitemap } from '../../../utils/community-page';

export async function getServerSideProps({
	res,
	query,
}: GetServerSidePropsContext<{
	communityId: string;
}>) {
	const id = query.communityId;
	console.log('id', id);
	if (typeof id !== 'string')
		throw new Error('domain must be a string' + ' but got ' + typeof id);
	const server = await findServerById(id);
	if (!server) {
		res.statusCode = 404;
		res.end();
		return {
			props: {},
		};
	}
	await generateCommunityPageSitemap({
		baseUrl: `https://www.answeroverflow.com`,
		communityId: server.id,
		res,
	});

	return {
		props: {},
	};
}

export default getServerSideProps;
