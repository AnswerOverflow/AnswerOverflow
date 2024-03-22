import { getPopularPostPages } from '@answeroverflow/analytics/src/query';
import { FeedPost } from './components';
export const revalidate = 3600; // revalidate at most every hour

export default async function HomePage() {
	const popularPages = await getPopularPostPages().then((res) =>
		Object.keys(res),
	);
	return popularPages.map((x) => <FeedPost postId={x} key={x} />);
}
