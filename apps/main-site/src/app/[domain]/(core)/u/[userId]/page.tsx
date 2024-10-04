import { FeedPost } from '@answeroverflow/ui/feed-post';
import { GiSpiderWeb } from 'react-icons/gi';
import { ActualLayout, getUserPageData } from './components';

type Props = {
	params: { userId: string; domain: string };
	searchParams: { s?: string };
};

export default async function UserPage(props: Props) {
	const { threads } = await getUserPageData(props);
	return (
		<ActualLayout {...props}>
			<div className={'flex flex-col gap-4'}>
				{threads.length > 0 ? (
					threads.map((x) => <FeedPost postId={x.id} key={x.id} />)
				) : (
					<div className={'flex flex-row items-center justify-start gap-4'}>
						<GiSpiderWeb size={64} className="text-muted-foreground" />
						<span className={'text-xl'}>No posts found</span>
					</div>
				)}
			</div>
		</ActualLayout>
	);
}
