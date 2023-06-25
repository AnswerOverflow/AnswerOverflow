import { BrowseCommunitiesRenderer } from '@answeroverflow/ui/src/components/pages/BrowseCommunitiesPage';
import {
	countConsentingUsersInManyServers,
	findAllServers,
	zServerPublic,
} from '@answeroverflow/db';
import { type InferGetStaticPropsType } from 'next';

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
	const consentingUserCountPerServer = await countConsentingUsersInManyServers(
		nonKickedServers.map((server) => server.id),
	);

	const serversWithMoreThanTenConsentingUsers = nonKickedServers.filter(
		(server) => (consentingUserCountPerServer.get(server.id) ?? 0) > 10,
	);

	const serversByNameAlphabetical = serversWithMoreThanTenConsentingUsers.sort(
		(a, b) => a.name.localeCompare(b.name),
	);

	const asPublic = serversByNameAlphabetical.map((server) =>
		zServerPublic.parse(server),
	);
	return {
		props: {
			servers: asPublic,
		},
		revalidate: 60 * 10,
		// every 10 minutes
	};
}
