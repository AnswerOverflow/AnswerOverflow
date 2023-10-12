import { Home } from '@answeroverflow/ui/src/components/pages/Home';
import {
	countConsentingUsersInManyServers,
	findAllServers,
	zServerPublic,
} from '@answeroverflow/db';
const UGLY_ICONS = new Set(['883929594179256350']);

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

	return serversByNameAlphabetical
		.map((server) => zServerPublic.parse(server))
		.filter((server) => {
			if (server.icon === null) return false;
			if (UGLY_ICONS.has(server.id)) return false;
			return true;
		});
}

export default async function HomePage() {
	const data = await fetchServers();
	return <Home servers={data} />;
}
