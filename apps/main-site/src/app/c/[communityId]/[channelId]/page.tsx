import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { notFound, permanentRedirect, RedirectType } from 'next/navigation';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { CommunityPage } from '~ui/components/pages/CommunityPage';
import { z } from 'zod';

export default async function ({
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
		return permanentRedirect(`/c/${params.communityId}/${params.channelId}`);
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
		return permanentRedirect(
			`http${sharedEnvs.NODE_ENV === 'production' ? 's' : ''}://${
				communityPageData.server.customDomain
			}`,
			RedirectType.replace,
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
