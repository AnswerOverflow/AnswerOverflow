import { appRouter } from '@answeroverflow/api';
import { createSSGContext } from '@answeroverflow/api/src/router/context';
import { MessageResultPage, useIsUserInServer } from '@answeroverflow/ui';
import { createServerSideHelpers } from '@trpc/react-query/server';
import superjson from 'superjson';
import { trpc } from '@answeroverflow/ui';
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { TRPCError } from '@trpc/server';

export default function MessageResult(
	props: InferGetStaticPropsType<typeof getStaticProps>,
) {
	const { serverId, messageId, areAllMessagesPublic } = props;
	const isUserInServer = useIsUserInServer(serverId);
	const shouldFetchPrivateMessages =
		!areAllMessagesPublic && isUserInServer === 'in_server';
	const { data } = trpc.messages.threadFromMessageId.useQuery(messageId, {
		// For authenticated users that are in the server, we fetch the messages incase any of them are private
		enabled: shouldFetchPrivateMessages,
		// If we're doing SSG, then we don't change the queryHash so we can access the data, otherwise we set it to change with the auth state
		queryHash: shouldFetchPrivateMessages
			? `${messageId}-${isUserInServer}`
			: undefined,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});
	if (!data) {
		return null;
	}
	const { messages, parentChannel, server, thread } = data;
	return (
		<MessageResultPage
			messages={messages}
			channel={parentChannel}
			server={server}
			requestedId={messageId}
			thread={thread ?? undefined}
		/>
	);
}

export function getStaticPaths() {
	return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps(
	context: GetStaticPropsContext<{ messageId: string }>,
) {
	const ssg = createServerSideHelpers({
		router: appRouter,
		ctx: await createSSGContext(),
		transformer: superjson, // optional - adds superjson serialization
	});
	if (!context.params) {
		return {
			notFound: true,
		};
	}

	// prefetch `post.byId`
	try {
		const { server, messages } = await ssg.messages.threadFromMessageId.fetch(
			context.params.messageId,
		);
		if (!server.customDomain) {
			return {
				redirect: {
					destination: `https://www.answeroverflow.com/m/${context.params.messageId}`,
					permanent: process.env.NODE_ENV === 'production',
				},
			};
		}

		const areAllMessagesPublic = messages.every((message) => message.public);
		return {
			props: {
				trpcState: ssg.dehydrate(),
				serverId: server.id,
				areAllMessagesPublic,
				messageId: context.params.messageId,
				tenant: server,
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
