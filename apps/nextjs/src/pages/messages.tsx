import { appRouter } from "@answeroverflow/api";
import { createSSGContext } from "@answeroverflow/api/src/router/context";
import { MessageResultPage } from "@answeroverflow/ui";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import Head from "next/head";
import superjson from "superjson";
import { trpc } from "@answeroverflow/ui";

export default function MessageResult() {
  const postQuery = trpc.message_page.byId.useQuery("1061004449897779290");
  if (postQuery.status !== "success") {
    // won't happen since we're using `fallback: "blocking"`
    return <>Loading...</>;
  }
  const { data } = postQuery;
  const { messages, parent_channel, server } = data;

  return (
    <>
      <Head>
        <title>Answer Overflow</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MessageResultPage messages={messages} channel={parent_channel} server={server} />
    </>
  );
}

export async function getStaticProps() {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: await createSSGContext(),
    transformer: superjson, // optional - adds superjson serialization
  });
  // prefetch `post.byId`
  await ssg.message_page.byId.prefetch("1061004449897779290");
  return {
    props: {
      trpcState: ssg.dehydrate(),
    },
    revalidate: 1,
  };
}
