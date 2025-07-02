import { findServerWithCommunityPageData } from '@answeroverflow/core/pages';
import { findServerByCustomDomain } from '@answeroverflow/core/server';
import { CommunityPage } from '@answeroverflow/ui/pages/CommunityPage';
import { DiscordThemeLayout } from '@answeroverflow/ui/pages/discord-theme/layout';
import { ChannelOverview } from '@answeroverflow/ui/pages/discord-theme/channel-overview';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
export const metadata: Metadata = {
	alternates: {
		canonical: '/',
	},
};

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
		<DiscordThemeLayout
			channels={communityPageData.channels}
			tenant={server}
			server={server}
		>
			<ChannelOverview
				channels={communityPageData.channels}
				selectedChannel={selectedChannel}
				tenant={server}
				posts={communityPageData.posts}
				page={0}
				server={server}
				children={undefined}
			/>
		</DiscordThemeLayout>
	);
	return (
		<CommunityPage
			{...communityPageData}
			selectedChannel={selectedChannel}
			tenant={server}
			page={0}
		/>
	);
}
