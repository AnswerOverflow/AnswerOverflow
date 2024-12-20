import { findQuestionsForSitemapCached } from '@answeroverflow/core/sitemap';
import { BlueLink } from '@answeroverflow/ui/ui/blue-link';

type Props = {
	params: Promise<{ communityId: string; page: string }>;
};

export default async function CommunityPosts(props: Props) {
	const params = await props.params;
	const lookup = await findQuestionsForSitemapCached(params.communityId);

	if (!lookup) return <div>Community not found</div>;
	const pageSize = 5000;
	const currentPage = parseInt(params.page ?? '0');

	const { questions: allQuestion, server } = lookup;
	const questions = allQuestion.slice(
		currentPage * pageSize,
		(currentPage + 1) * pageSize,
	);

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
							href={`/c/${params.communityId}/posts/${currentPage + 1}`}
						>
							Next page
						</BlueLink>
					</li>
				)}
			</ul>
		</div>
	);
}
