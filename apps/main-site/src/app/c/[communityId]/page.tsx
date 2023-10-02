import { findServerWithCommunityPageData } from '@answeroverflow/db';
import { CommunityPage } from '@answeroverflow/ui/src/components/pages/CommunityPage';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { notFound, permanentRedirect, RedirectType } from 'next/navigation';

export default async function MessageResult({
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
			<CommunityPage {...communityPageData} />
		</>
	);
}
export const revalidate = 3600; // revalidate at most every hour
