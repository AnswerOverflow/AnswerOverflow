import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { TRPCError } from '@trpc/server';
import {
	CommunityPageData,
	findServerWithCommunityPageData,
} from '@answeroverflow/db';
import superjson from 'superjson';
import { CommunityPage } from '@answeroverflow/ui';

export default function MessageResult(
	props: InferGetStaticPropsType<typeof getStaticProps>,
) {
	const data = superjson.parse<CommunityPageData>(props.data);
	return (
		<>
			<CommunityPage {...data} />
		</>
	);
}

// TODO: Do all at build time?
export function getStaticPaths() {
	return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps(
	context: GetStaticPropsContext<{ communityId: string }>,
) {
	if (!context.params) {
		return {
			notFound: true,
		};
	}

	const serverId = context.params.communityId;
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: serverId,
		limit: 20,
	});

	if (!communityPageData) {
		return {
			notFound: true,
		};
	}

	// prefetch `post.byId`
	try {
		return {
			props: {
				data: superjson.stringify(communityPageData),
			},
			revalidate: 60 * 10, // every 10 minutes
		};
	} catch (error) {
		if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
			return {
				notFound: true,
			};
		} else {
			throw error;
		}
	}
}
