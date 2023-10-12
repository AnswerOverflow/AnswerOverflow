import { BrowseCommunitiesRenderer } from '~ui/components/pages/BrowseCommunitiesPage';
import {
	countConsentingUsersInManyServers,
	findAllServers,
	zServerPublic,
} from '@answeroverflow/db';

export default async function BrowseCommunitiesPage() {
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
	return <BrowseCommunitiesRenderer servers={asPublic} />;
}
