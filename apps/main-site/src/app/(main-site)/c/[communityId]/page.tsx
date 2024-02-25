import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { CommunityPage } from '@answeroverflow/ui/src/pages/CommunityPage';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
type Props = {
	params: { communityId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		selectedChannel: undefined,
		page: 0,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
	}
	if (communityPageData.server.customDomain) {
		return redirect(
			`http${sharedEnvs.NODE_ENV === 'production' ? 's' : ''}://${
				communityPageData.server.customDomain
			}`,
		);
	}
	return {
		title: `${communityPageData.server.name} Community - Answer Overflow`,
		description:
			communityPageData.server.description ??
			`Questions and answers related to ${communityPageData.server.name}`,
		openGraph: {
			title: `${communityPageData.server.name} Community - Answer Overflow`,
			description:
				communityPageData.server.description ??
				`Questions and answers related to ${communityPageData.server.name}`,
		},
	};
}
export default async function CommunityPageContainer({ params }: Props) {
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		selectedChannel: undefined,
		page: 0,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
	}
	if (communityPageData.server.customDomain) {
		return redirect(
			`http${sharedEnvs.NODE_ENV === 'production' ? 's' : ''}://${
				communityPageData.server.customDomain
			}`,
		);
	}
	const selectedChannel = communityPageData.channels[0];
	return (
		<CommunityPage
			{...communityPageData}
			selectedChannel={selectedChannel}
			tenant={undefined}
			page={0}
		/>
	);
}
