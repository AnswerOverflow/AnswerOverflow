import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { CommunityPage } from '@answeroverflow/ui/src/components/pages/CommunityPage';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { notFound, permanentRedirect, RedirectType } from 'next/navigation';

export default async function CommunityPageContainer({
	params,
}: {
	params: { communityId: string };
}) {
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		selectedChannel: undefined,
		page: 0,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
	}
	if (communityPageData.server.customDomain) {
		return permanentRedirect(
			`http${sharedEnvs.NODE_ENV === 'production' ? 's' : ''}://${
				communityPageData.server.customDomain
			}`,
			RedirectType.replace,
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
