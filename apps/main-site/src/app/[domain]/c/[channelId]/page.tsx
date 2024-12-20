import { findServerWithCommunityPageData } from '@answeroverflow/core/pages';
import { findServerByCustomDomain } from '@answeroverflow/core/server';
import { CommunityPage } from '@answeroverflow/ui/pages/CommunityPage';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
export { generateMetadata } from '../../layout';

type Props = {
	params: Promise<{ domain: string; channelId: string }>;
	searchParams: Promise<{
		page: string | undefined;
	}>;
};

export const revalidate = 86400;

export default async function TenantChannelPage(props: Props) {
	const searchParams = await props.searchParams;
	const params = await props.params;
	const page = z.coerce.number().parse(searchParams.page ?? '0');
	if (searchParams.page && page === 0) {
		return redirect(`/c/${params.channelId}`);
	}
	const domain = decodeURIComponent(params.domain);
	const server = await findServerByCustomDomain(domain);
	if (!server) {
		return notFound();
	}

	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: server.id,
		selectedChannel: params.channelId,
		page: page,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
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
			tenant={server}
			page={page}
		/>
	);
}
