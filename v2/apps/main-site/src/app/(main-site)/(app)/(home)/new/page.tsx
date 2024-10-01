import { findLatestThreads } from "@answeroverflow/core/channel";
import { FeedPost } from "@answeroverflow/ui/feed-post";

export default async function HomePage() {
  const latestPages = await findLatestThreads({
    take: 20,
  });
  return latestPages.map((x) => <FeedPost postId={x.id} key={x.id} />);
}
