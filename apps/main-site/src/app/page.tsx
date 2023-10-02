import { Home } from '@answeroverflow/ui/src/components/pages/Home';
import {
	countConsentingUsersInManyServers,
	findAllServers,
	zServerPublic,
} from '@answeroverflow/db';

async function fetchServers() {
	const servers = await findAllServers();
	const nonKickedServers = servers.filter(
		(server) => server.kickedTime === null,
	);
	const consentingUserCountPerServer = await countConsentingUsersInManyServers(
		nonKickedServers.map((server) => server.id),
	);

	const serversWithMoreThanTenConsentingUsers = nonKickedServers.filter(
		(server) => {
			if ((consentingUserCountPerServer.get(server.id) ?? 0) > 10) return true;
			// TODO: Implement some sort of filtering to prevent people from just adding random communities to homepage
			if (server.flags.considerAllMessagesPublic) return true;
			return false;
		},
	);

	const serversByNameAlphabetical = serversWithMoreThanTenConsentingUsers.sort(
		(a, b) => a.name.localeCompare(b.name),
	);

	return serversByNameAlphabetical.map((server) => zServerPublic.parse(server));
}

export default async function HomePage() {
	const data = await fetchServers();
	return <Home servers={data} />;
}
