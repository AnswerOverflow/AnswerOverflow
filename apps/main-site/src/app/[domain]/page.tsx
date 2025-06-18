import { findServerWithCommunityPageData } from '@answeroverflow/core/pages';
import { findServerByCustomDomain } from '@answeroverflow/core/server';
import { DiscordCommunityPageTheme } from '@answeroverflow/ui/pages/discord-community-page-theme';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
	alternates: {
		canonical: '/',
	},
};

export const revalidate = 86400;
export default async function TenantHome(props: {
	params: Promise<{ domain: string }>;
}) {
	const params = await props.params;
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
		<DiscordCommunityPageTheme
			{...communityPageData}
			selectedChannel={selectedChannel}
			tenant={server}
			page={0}
		/>
	);
}
