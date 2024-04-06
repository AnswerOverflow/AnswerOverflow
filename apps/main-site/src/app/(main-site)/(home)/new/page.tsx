import { FeedPost } from '../components';
import { findLatestThreads } from '@answeroverflow/db';
export const dynamic = 'force-static';

export default async function HomePage() {
	const latestPages = await findLatestThreads({
		take: 20,
	});
	return latestPages.map((x) => <FeedPost postId={x.id} key={x.id} />);
}
