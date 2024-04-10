import { findQuestionsForSitemapCached } from '@answeroverflow/cache';
import { BlueLink } from '@answeroverflow/ui/src/ui/blue-link';

type Props = {
	params: { communityId: string };
	searchParams: {
		page: string | undefined;
	};
};
export const dynamic = 'force-static';

export default async function CommunityPosts({
	params,
	searchParams: { page },
}: Props) {
	const lookup = await findQuestionsForSitemapCached(params.communityId);

	if (!lookup) return <div>Community not found</div>;
	const pageSize = 5000;
	const { questions: allQuestion, server } = lookup;
	const questions = page
		? allQuestion.slice(
				parseInt(page) * pageSize,
				(parseInt(page) + 1) * pageSize,
		  )
		: allQuestion.slice(0, pageSize);
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
				{questions.length === pageSize && (
					<li>
						<BlueLink
							prefetch={false}
							href={`/c/${params.communityId}/posts?page=${
								parseInt(page ?? '0') + 1
							}`}
						>
							Next page
						</BlueLink>
					</li>
				)}
			</ul>
		</div>
	);
}
