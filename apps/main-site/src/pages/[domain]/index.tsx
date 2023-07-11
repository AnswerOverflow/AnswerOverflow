import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { TRPCError } from '@trpc/server';
import {
	type CommunityPageData,
	findServerWithCommunityPageData,
	findServerByCustomDomain,
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
	context: GetStaticPropsContext<{ domain: string }>,
) {
	if (!context.params) {
		return {
			notFound: true,
		};
	}

	const domain = context.params.domain;
	const server = await findServerByCustomDomain(domain);
	if (!server) {
		return {
			notFound: true,
		};
	}
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: server.id,
		limit: 20,
	});

	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return {
			notFound: true,
		};
	}

	// prefetch `post.byId`
	try {
		return {
			props: {
				data: superjson.stringify(communityPageData),
				tenant: communityPageData.server,
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
