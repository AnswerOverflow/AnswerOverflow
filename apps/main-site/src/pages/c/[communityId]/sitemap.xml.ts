import type { GetServerSidePropsContext } from 'next';
// eslint-disable-next-line no-restricted-imports
import { generateCommunityPageSitemap } from '../../../utils/community-page';

// TODO: This needs to get chunked when its past 50,000 URLs
export async function getServerSideProps({
	res,
	params,
}: GetServerSidePropsContext) {
	const communityId = params?.communityId as string;
	await generateCommunityPageSitemap({
		baseUrl: 'https://www.answeroverflow.com',
		communityId,
		res,
	});
	return {
		props: {},
	};
}

export default getServerSideProps;
