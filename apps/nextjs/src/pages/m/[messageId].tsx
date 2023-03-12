import { appRouter } from "@answeroverflow/api";
import { createSSGContext } from "@answeroverflow/api/src/router/context";
import { MessageResultPage, AOHead, useIsUserInServer } from "@answeroverflow/ui";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import superjson from "superjson";
import { trpc } from "@answeroverflow/ui";
import type { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import { TRPCError } from "@trpc/server";

export default function MessageResult(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const { serverId, messageId, areAllMessagesPublic } = props;

	const isUserInServer = useIsUserInServer(serverId);
	const shouldFetchPrivateMessages = isUserInServer && !areAllMessagesPublic;
	const { data } = trpc.messagePage.threadFromMessageId.useQuery(messageId, {
		// For authenticated users that are in the server, we fetch the messages incase any of them are private
		enabled: shouldFetchPrivateMessages,
		// If we're doing SSG, then we don't change the queryHash so we can access the data, otherwise we set it to change with the auth state
		queryHash: shouldFetchPrivateMessages
			? `${messageId}-${isUserInServer.toString()}`
			: undefined,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false,
		refetchOnMount: false
	});
	if (!data) {
		return null;
	}
	const { messages, parentChannel, server, thread } = data;

	const firstMessage = messages.at(0);
	const channelName = thread?.name ?? parentChannel.name;
	const description =
		firstMessage && firstMessage.content?.length > 0
			? firstMessage.content
			: `Questions related to ${channelName} in ${server.name}`;
	return (
		<>
			<AOHead
				description={description}
				path={`/m/${messageId}`}
				title={`${channelName} - ${server.name}`}
			/>
			<MessageResultPage
				messages={messages}
				channel={parentChannel}
				server={server}
				thread={thread ?? undefined}
			/>
		</>
	);
}

export function getStaticPaths() {
	return { paths: [], fallback: "blocking" };
}

export async function getStaticProps(context: GetStaticPropsContext<{ messageId: string }>) {
	const ssg = createProxySSGHelpers({
		router: appRouter,
		ctx: await createSSGContext(),
		transformer: superjson // optional - adds superjson serialization
	});
	if (!context.params) {
		return {
			notFound: true
		};
	}

	// prefetch `post.byId`
	try {
		const { server, messages } = await ssg.messagePage.threadFromMessageId.fetch(
			context.params.messageId
		);
		const areAllMessagesPublic = messages.every((message) => message.public);
		return {
			props: {
				trpcState: ssg.dehydrate(),
				serverId: server.id,
				areAllMessagesPublic,
				messageId: context.params.messageId
			},
			revalidate: 60 * 10 // every 10 minutes
		};
	} catch (error) {
		if (error instanceof TRPCError && error.code === "NOT_FOUND") {
			return {
				notFound: true
			};
		} else {
			throw error;
		}
	}
}
