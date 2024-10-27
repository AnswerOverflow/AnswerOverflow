import { findAllServers } from '@answeroverflow/core/server';
import { countConsentingUsersInManyServers } from '@answeroverflow/core/user-server-settings';
import { zServerPublic } from '@answeroverflow/core/zod';

export async function fetchBrowseServers() {
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
