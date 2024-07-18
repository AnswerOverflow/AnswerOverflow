import { getPopularPostPages } from '@answeroverflow/analytics/src/query';
import { FeedPost } from '@answeroverflow/ui/src/feed-post';
export const revalidate = 86400; // revalidate at most every hour

export default async function HomePage() {
	const popularPages =
		(await getPopularPostPages()?.then((res) => Object.keys(res))) ?? [];
	return popularPages.map((x) => <FeedPost postId={x} key={x} />);
}
