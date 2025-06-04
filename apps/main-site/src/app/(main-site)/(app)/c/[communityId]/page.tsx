import { findServerWithCommunityPageData } from '@answeroverflow/core/pages';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { CommunityPage } from '@answeroverflow/ui/pages/CommunityPage';
import { getServerCustomUrl } from '@answeroverflow/ui/utils/server';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

type Props = {
	params: Promise<{ communityId: string }>;
	searchParams: Promise<{
		uwu?: string;
	}>;
};
export const dynamic = 'force-static';
export const revalidate = 3600;
export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		selectedChannel: undefined,
		page: 0,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
	}
	if (communityPageData.server.customDomain) {
		const customUrl = getServerCustomUrl(communityPageData.server);
		if (customUrl) {
			return redirect(customUrl);
		}
	}
	return {
		title: `${communityPageData.server.name} Community - Answer Overflow`,
		description:
			communityPageData.server.description ??
			`Questions and answers related to ${communityPageData.server.name}`,
		alternates: {
			canonical: `/c/${communityPageData.server.id}`,
		},
		openGraph: {
			title: `${communityPageData.server.name} Community - Answer Overflow`,
			description:
				communityPageData.server.description ??
				`Questions and answers related to ${communityPageData.server.name}`,
		},
	};
}
export default async function CommunityPageContainer(props: Props) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		selectedChannel: undefined,
		page: 0,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
	}
	if (communityPageData.server.customDomain) {
		const customUrl = getServerCustomUrl(communityPageData.server);
		if (customUrl) {
			return redirect(customUrl);
		}
	}
	const selectedChannel = communityPageData.channels[0];
	return (
		<CommunityPage
			{...communityPageData}
			uwu={!!searchParams.uwu}
			selectedChannel={selectedChannel}
			tenant={undefined}
			page={0}
		/>
	);
}
