import { BrowseCommunitiesRenderer } from '@answeroverflow/ui/src/components/pages/BrowseCommunitiesPage';
import { findAllServers, zServerPublic } from '@answeroverflow/db';
import { InferGetStaticPropsType } from 'next';

export default function BrowseCommunitiesPage(
	props: InferGetStaticPropsType<typeof getStaticProps>,
) {
	return <BrowseCommunitiesRenderer {...props} />;
}

export async function getStaticProps() {
	const servers = await findAllServers();
	const nonKickedServers = servers.filter(
		(server) => server.kickedTime === null,
	);
	const asPublic = nonKickedServers.map((server) =>
		zServerPublic.parse(server),
	);
	return {
		props: {
			servers: asPublic,
		},
		// every day
		revalidate: 60 * 60 * 24,
	};
}
