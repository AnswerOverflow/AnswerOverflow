import { fetchBrowseServers } from '../../../../data/browse';
import { Metadata } from 'next';
import { metadata as baseMetadata } from '../../../layout';
import { Heading } from '@answeroverflow/ui/src/ui/heading';
import { ViewServerCard } from '@answeroverflow/ui/src/server-card';
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

export const revalidate = 86400;
export default async function BrowseCommunitiesPage() {
	const data = await fetchBrowseServers();
	return (
		<>
			<Heading.H1 className="text-xl md:text-xl">Browse Communities</Heading.H1>
			<div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{data.map((server) => {
					return (
						<div
							key={`server-${server.id}-area`}
							className="w-full max-w-md rounded-md p-4 transition-all"
						>
							<ViewServerCard server={server} />
						</div>
					);
				})}
			</div>
		</>
	);
}
