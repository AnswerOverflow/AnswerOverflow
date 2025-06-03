import { findServerWithCommunityPageData } from '@answeroverflow/core/pages';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { CommunityPage } from '@answeroverflow/ui/pages/CommunityPage';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { getServerCustomUrl } from '@answeroverflow/ui/utils/server';

export { generateMetadata } from '../page';

export default async function CommunityChannelPage(props: {
	params: Promise<{ communityId: string; channelId: string }>;
	searchParams: Promise<{
		page: string | undefined;
		uwu?: string | undefined;
	}>;
}) {
	const searchParams = await props.searchParams;
	const params = await props.params;
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
		const customUrl = getServerCustomUrl(communityPageData.server);
		if (customUrl) {
			return redirect(customUrl);
		}
	}
	const selectedChannel = communityPageData.channels.find(
		(channel) => channel.id === params.channelId,
	);
	if (!selectedChannel) {
		return notFound();
	}
	const uwu = !!searchParams.uwu;

	return (
		<CommunityPage
			{...communityPageData}
			selectedChannel={selectedChannel}
			uwu={uwu}
			tenant={undefined}
			page={page}
		/>
	);
}
