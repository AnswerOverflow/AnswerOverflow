import { FeedPost } from '@answeroverflow/ui/feed-post';
import { Metadata } from 'next';
import { GiSpiderWeb } from 'react-icons/gi';
import { ActualLayout, getUserPageData } from '../components';

type Props = {
	params: Promise<{ userId: string; domain: string }>;
	searchParams: Promise<{ s?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { userInfo, server } = await getUserPageData(props);
	return {
		title: `${userInfo.name} Comments - ${server.name}`,
		description: `See comments from ${userInfo.name} in the ${server.name} Discord`,
		alternates: {
			canonical: `https://${server.customDomain}/u/${userInfo.id}`,
		},
		openGraph: {
			title: `${userInfo.name} Comments - ${server.name}`,
			description: `See comments from ${userInfo.name} in the ${server.name} Discord`,
		},
	};
}

export default async function UserPage(props: Props) {
	const { comments } = await getUserPageData(props);
	return (
		<ActualLayout {...props}>
			<div className={'flex flex-col gap-4'}>
				{comments.length > 0 ? (
					comments.map((x) => (
						<FeedPost postId={x.id} key={x.id} onTenant={true} />
					))
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
