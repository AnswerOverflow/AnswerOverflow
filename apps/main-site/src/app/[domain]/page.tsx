import {
	findServerByCustomDomain,
	findServerWithCommunityPageData,
} from '@answeroverflow/db';
import { notFound } from 'next/navigation';
import { CommunityPage } from '@answeroverflow/ui/src/components/pages/CommunityPage';

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
		limit: 20,
	});
	if (!communityPageData || communityPageData.server.kickedTime != null) {
		return notFound();
	}
	return (
		<CommunityPage
			isOnTenantSite={true}
			server={communityPageData.server}
			channels={communityPageData.channels}
		/>
	);
}
