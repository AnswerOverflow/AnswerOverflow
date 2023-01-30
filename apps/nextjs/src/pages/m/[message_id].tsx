import { appRouter } from "@answeroverflow/api";
import { createSSGContext } from "@answeroverflow/api/src/router/context";
import { MessageResultPage, AOHead, useIsUserInServer } from "@answeroverflow/ui";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import superjson from "superjson";
import { trpc } from "@answeroverflow/ui";
import type { GetStaticPropsContext, InferGetStaticPropsType } from "next";
import { TRPCError } from "@trpc/server";

export default function MessageResult(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const { root_message_id, parent_channel, server, thread } = props;
  let { messages } = props;

  // For authenticated users that are in the server, we fetch the messages incase any of them are private
  const is_user_in_server = useIsUserInServer(server.id);
  const { data } = trpc.message_page.byId.useQuery(root_message_id, {
    enabled: is_user_in_server && !messages.every((message) => message.public),
    queryHash: `message_page-${root_message_id}-${is_user_in_server.toString()}`,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  messages = data?.messages ?? messages;

  const first_message = messages.at(0);
  const channel_name = thread?.name ?? parent_channel.name;
  const description =
    first_message && first_message.content?.length > 0
      ? first_message.content
      : `Questions related to ${channel_name} in ${server.name}`;
  return (
    <>
      <AOHead
        description={description}
        path={`/m/${root_message_id}`}
        title={`${channel_name} - ${server.name}`}
      />
      <MessageResultPage
        messages={messages}
        channel={parent_channel}
        server={server}
        thread={thread}
      />
    </>
  );
}

export function getStaticPaths() {
  return { paths: [], fallback: "blocking" };
}

export async function getStaticProps(context: GetStaticPropsContext<{ message_id: string }>) {
  const ssg = createProxySSGHelpers({
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
    const { server, messages, parent_channel, thread } = await ssg.message_page.byId.fetch(
      context.params.message_id
    );

    return {
      props: {
        trpcState: ssg.dehydrate(),
        root_message_id: context.params.message_id,
        server,
        messages,
        parent_channel,
        thread,
      },
      revalidate: 60 * 10, // every 10 minutes
    };
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return {
        notFound: true,
      };
    } else {
      throw error;
    }
  }
}
