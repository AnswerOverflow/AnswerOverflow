import { FeedPost } from '@answeroverflow/ui/feed-post';
import { Metadata } from 'next';
import { GiSpiderWeb } from 'react-icons/gi';
import { ActualLayout, getUserPageData } from '../components';

type Props = {
	params: Promise<{ userId: string }>;
	searchParams: Promise<{ s?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { userInfo } = await getUserPageData(props);
	return {
		title: `${userInfo.name} Comments - Answer Overflow`,
		description: `See comments from ${userInfo.name} on Answer Overflow`,
		alternates: {
			canonical: `/u/${userInfo.id}`,
		},
		openGraph: {
			title: `${userInfo.name} Comments - Answer Overflow`,
			description: `See comments from ${userInfo.name} on Answer Overflow`,
		},
	};
}

export default async function UserPage(props: Props) {
	const { comments } = await getUserPageData(props);
	return (
		<ActualLayout {...props}>
			<div className={'flex flex-col gap-4'}>
				{comments.length > 0 ? (
					comments.map((x) => <FeedPost postId={x.id} key={x.id} />)
				) : (
					<div className={'flex flex-row items-center justify-start gap-4'}>
						<GiSpiderWeb size={64} className="text-muted-foreground" />
						<span className={'text-xl'}>No comments found</span>
					</div>
				)}
			</div>
		</ActualLayout>
	);
}
