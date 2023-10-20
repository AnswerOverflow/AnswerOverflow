import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { notFound, permanentRedirect, RedirectType } from 'next/navigation';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { CommunityPage } from '~ui/components/pages/CommunityPage';

export default async function ({
	params,
}: {
	params: { communityId: string; channelId: string };
}) {
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		limit: 20,
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
	const selectedChannel = communityPageData.channels.find(
		(channel) => channel.channel.id === params.channelId,
	);
	if (!selectedChannel) {
		return notFound();
	}
	return (
		<CommunityPage
			{...communityPageData}
			selectedChannel={selectedChannel}
			tenant={undefined}
		/>
	);
}
