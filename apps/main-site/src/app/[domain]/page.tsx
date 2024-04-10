import {
	findServerByCustomDomain,
	findServerWithCommunityPageData,
} from '@answeroverflow/db';
import { notFound } from 'next/navigation';
import { CommunityPage } from '@answeroverflow/ui/src/pages/CommunityPage';
import { Metadata } from 'next';
export const metadata: Metadata = {
	alternates: {
		canonical: '/',
	},
};

export const revalidate = 600;
export default async function TenantHome({
	params,
}: {
	params: { domain: string };
}) {
	const domain = decodeURIComponent(params.domain);
	const server = await findServerByCustomDomain(domain);
	if (!server) {
		return notFound();
	}
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: server.id,
		selectedChannel: undefined,
		page: 0,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
	}
	const selectedChannel = communityPageData.channels[0];
	return (
		<CommunityPage
			{...communityPageData}
			selectedChannel={selectedChannel}
			tenant={server}
			page={0}
		/>
	);
}
