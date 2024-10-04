import { Analytics } from '@answeroverflow/core/analytics';
import { FeedPost } from '@answeroverflow/ui/feed-post';
export const revalidate = 86400; // revalidate at most every hour

export default async function HomePage() {
	const popularPages =
		(await Analytics.getPopularPostPages()?.then((res) =>
			Object.keys(res ?? {}),
		)) ?? [];
	return popularPages.map((x) => <FeedPost postId={x} key={x} />);
}
