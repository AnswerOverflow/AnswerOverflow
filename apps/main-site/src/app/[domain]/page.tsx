import {
	findServerByCustomDomain,
	findServerWithCommunityPageData,
} from '@answeroverflow/db';
import { notFound } from 'next/navigation';
import { CommunityPage } from '@answeroverflow/ui/src/components/pages/CommunityPage';
import { Metadata } from 'next';
export const metadata: Metadata = {
	appLinks: {},
};
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
			server={communityPageData.server}
			channels={communityPageData.channels}
		/>
	);
}
