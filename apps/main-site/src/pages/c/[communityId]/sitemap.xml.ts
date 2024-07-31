import type { GetServerSidePropsContext } from 'next';
import { findServerById } from '@answeroverflow/db';
import { generateCommunityPageSitemap } from '../../../utils/community-page';
// eslint-disable-next-line no-restricted-imports

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
		baseUrl: `https://${id}`,
		communityId: server.id,
		res,
	});

	return {
		props: {},
	};
}

export default getServerSideProps;
