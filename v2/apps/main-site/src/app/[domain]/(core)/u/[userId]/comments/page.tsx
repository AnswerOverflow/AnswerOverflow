import { FeedPost } from "@answeroverflow/ui/feed-post";
import { ActualLayout, getUserPageData } from "../components";
import { GiSpiderWeb } from "react-icons/gi";
import { Metadata } from "next";

type Props = {
  params: { userId: string; domain: string };
  searchParams: { s?: string };
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { userInfo, server } = await getUserPageData(props);
  return {
    title: `${userInfo.name} Comments - ${server.name}`,
    description: `See comments from ${userInfo.name} in the ${server.name} Discord`,
    alternates: {
      canonical: `https://${server.customDomain}/u/${userInfo.id}`,
    },
    openGraph: {
      title: `${userInfo.name} Comments - ${server.name}`,
      description: `See comments from ${userInfo.name} in the ${server.name} Discord`,
    },
  };
}

export default async function UserPage(props: Props) {
  const { comments } = await getUserPageData(props);
  return (
    <ActualLayout {...props}>
      <div className={"flex flex-col gap-4"}>
        {comments.length > 0 ? (
          comments.map((x) => <FeedPost postId={x.id} key={x.id} />)
        ) : (
          <div className={"flex flex-row items-center justify-start gap-4"}>
            <GiSpiderWeb size={64} className="text-muted-foreground" />
            <span className={"text-xl"}>No comments found</span>
          </div>
        )}
      </div>
    </ActualLayout>
  );
}
