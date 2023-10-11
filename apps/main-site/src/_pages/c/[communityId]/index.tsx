import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { TRPCError } from '@trpc/server';
import {
	type CommunityPageData,
	findServerWithCommunityPageData,
} from '@answeroverflow/db';
import superjson from 'superjson';
import { CommunityPage } from '@answeroverflow/ui/src/components/pages/CommunityPage';
import { sharedEnvs } from '@answeroverflow/env/shared';

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
)
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

	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return {
			notFound: true,
		};
	}

	if (communityPageData.server.customDomain) {
		return {
			redirect: {
				destination: `http${
					sharedEnvs.NODE_ENV === 'production' ? 's' : ''
				}://${communityPageData.server.customDomain}`,
				permanent: sharedEnvs.NODE_ENV === 'production',
			},
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
