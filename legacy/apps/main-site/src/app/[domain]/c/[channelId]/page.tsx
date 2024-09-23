import {
	findServerByCustomDomain,
	findServerWithCommunityPageData,
} from '@answeroverflow/db';
import { notFound, redirect } from 'next/navigation';
import { CommunityPage } from '@answeroverflow/ui/src/pages/CommunityPage';
import { z } from 'zod';
export { generateMetadata } from '../../layout';

type Props = {
	params: { domain: string; channelId: string };
	searchParams: {
		page: string | undefined;
	};
};

export const revalidate = 86400;

export default async function TenantChannelPage({
	params,
	searchParams,
}: Props) {
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
