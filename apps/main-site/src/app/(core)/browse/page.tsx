import { BrowseCommunitiesRenderer } from '@answeroverflow/ui/src/components/pages/BrowseCommunitiesPage';

import { fetchBrowseServers } from '../../page';
import { Metadata } from 'next';
import { metadata as baseMetadata } from '../../layout';
export const metadata: Metadata = {
	title: 'Browse All Communities - Answer Overflow',
	description:
		'Browse all of the communities on Answer Overflow. Find the best Discord servers to join and learn about the communities that are out there.',
	openGraph: {
		...baseMetadata.openGraph,
		title: 'Browse All Communities - Answer Overflow',
		description:
			'Browse all of the communities on Answer Overflow. Find the best Discord servers to join and learn about the communities that are out there.',
	},
};
export default async function BrowseCommunitiesPage() {
	const data = await fetchBrowseServers();
	return <BrowseCommunitiesRenderer servers={data} />;
}
