import { Home } from '@answeroverflow/ui/src/components/pages/Home';
import {
	countConsentingUsersInManyServers,
	findAllServers,
	zServerPublic,
} from '@answeroverflow/db';

// Yeah that's right I think these icons are ugly and I'm not afraid to say it
const UGLY_ICONS = new Set(['883929594179256350']);

// eslint-disable-next-line @typescript-eslint/naming-convention
export default async function Page() {
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

	const asPublic = serversByNameAlphabetical.map((server) =>
		zServerPublic.parse(server),
	);

	const publicServers = asPublic
		.map((server) => ({
			name: server.name,
			id: server.id,
			icon: server.icon,
		}))
		.filter((server) => {
			if (server.icon === null) return false;
			if (UGLY_ICONS.has(server.id)) return false;
			return true;
		});

	return (
		<>
			<Home servers={publicServers} />
		</>
	);
}
