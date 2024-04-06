import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { notFound, redirect } from 'next/navigation';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { CommunityPage } from '@answeroverflow/ui/src/pages/CommunityPage';
import { z } from 'zod';
export const dynamic = 'force-static';

export default async function CommunityChannelPage({
	params,
	searchParams,
}: {
	params: { communityId: string; channelId: string };
	searchParams: {
		page: string | undefined;
	};
}) {
	const page = z.coerce.number().parse(searchParams.page ?? '0');
	if (searchParams.page && page === 0) {
		return redirect(`/c/${params.communityId}/${params.channelId}`);
	}
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		selectedChannel: params.channelId,
		page: page,
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
	const selectedChannel = communityPageData.channels.find(
		(channel) => channel.id === params.channelId,
	);
	if (!selectedChannel) {
		return notFound();
	}

	return (
		<CommunityPage
			{...communityPageData}
			selectedChannel={selectedChannel}
			tenant={undefined}
			page={page}
		/>
	);
}
