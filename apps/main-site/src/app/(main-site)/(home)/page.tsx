import { getPopularPostPages } from '@answeroverflow/analytics/src/query';
import { FeedPost } from './components';

export default async function HomePage() {
	const popularPages = await getPopularPostPages().then((res) =>
		Object.keys(res),
	);
	return popularPages.map((x) => <FeedPost postId={x} key={x} />);
}
