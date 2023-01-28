import { appRouter } from "@answeroverflow/api";
import { createSSGContext } from "@answeroverflow/api/src/router/context";
import { MessageResultPage, AOHead } from "@answeroverflow/ui";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import superjson from "superjson";
import { trpc } from "@answeroverflow/ui";
import type { GetStaticPropsContext, InferGetStaticPropsType } from "next";

export default function MessageResult(props: InferGetStaticPropsType<typeof getStaticProps>) {
  const { message_id } = props;

  const postQuery = trpc.message_page.byId.useQuery(message_id);
  if (postQuery.status !== "success") {
    // won't happen since we're using `fallback: "blocking"`
    return <>Loading...</>;
  }
  const { data } = postQuery;
  const { messages, parent_channel, server, thread } = data;
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
        path={`/m/${message_id}`}
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
    await ssg.message_page.byId.fetch(context.params.message_id);
  } catch (error) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      trpcState: ssg.dehydrate(),
      message_id: context.params.message_id,
    },
    revalidate: 60 * 10, // every 10 minutes
  };
}
