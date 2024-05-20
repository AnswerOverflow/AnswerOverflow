import { FeedPost } from '@answeroverflow/ui/src/feed-post';
import { findLatestThreads } from '@answeroverflow/db';

export default async function HomePage() {
	const latestPages = await findLatestThreads({
		take: 20,
	});
	return latestPages.map((x) => <FeedPost postId={x.id} key={x.id} />);
}
