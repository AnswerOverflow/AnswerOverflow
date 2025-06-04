import { findLatestThreads } from '@answeroverflow/core/channel';
import { FeedPost } from '@answeroverflow/ui/feed-post';
export const dynamic = 'force-static';
export const revalidate = 3600;
export default async function HomePage() {
	const latestPages = await findLatestThreads({
		take: 20,
	});
	return latestPages.map((x) => <FeedPost postId={x.id} key={x.id} />);
}
