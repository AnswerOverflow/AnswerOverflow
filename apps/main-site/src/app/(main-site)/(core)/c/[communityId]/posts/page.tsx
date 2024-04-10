import { findQuestionsForSitemapCached } from '@answeroverflow/cache';
import { BlueLink } from '@answeroverflow/ui/src/ui/blue-link';

type Props = {
	params: { communityId: string };
};
export const dynamic = 'force-static';

export default async function CommunityPosts({ params }: Props) {
	const lookup = await findQuestionsForSitemapCached(params.communityId);
	if (!lookup) return <div>Community not found</div>;
	const { questions, server } = lookup;
	return (
		<div className="mx-auto max-w-2xl">
			<h1 className="font-bold">All posts for {server.name}</h1>
			<ul className="ml-4 list-disc">
				{questions.map(({ thread }) => (
					<li key={thread.id}>
						<BlueLink prefetch={false} href={`/m/${thread.id}`}>
							{thread.name}
						</BlueLink>
					</li>
				))}
			</ul>
		</div>
	);
}
