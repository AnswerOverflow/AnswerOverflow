import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { CommunityPage } from '@answeroverflow/ui/src/components/pages/CommunityPage';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { notFound, permanentRedirect, RedirectType } from 'next/navigation';
export const dynamic = 'error';

export default async function CommunityPageContainer({
	params,
}: {
	params: { communityId: string };
}) {
	const communityPageData = await findServerWithCommunityPageData({
		idOrVanityUrl: params.communityId,
		limit: 20,
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

	return (
		<>
			<h1>
				Render time:
				{new Date().toLocaleTimeString()}
			</h1>
			<CommunityPage
				{...communityPageData}
				isOnTenantSite={communityPageData.server.customDomain != null}
			/>
		</>
	);
}
export const revalidate = 3600; // revalidate at most every hour
