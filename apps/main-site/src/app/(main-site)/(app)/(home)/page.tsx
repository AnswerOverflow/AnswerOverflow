// import { Analytics } from '@answeroverflow/core/analytics';
// import { FeedPost } from '@answeroverflow/ui/feed-post';
// export const revalidate = 86400; // revalidate at most every hour

// export default async function HomePage() {
// 	const popularPages =
// 		(await Analytics.getPopularPostPages()?.then((res) =>
// 			Object.keys(res ?? {}),
// 		)) ?? [];
// 	return popularPages.map((x) => <FeedPost postId={x} key={x} />);
// }

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
