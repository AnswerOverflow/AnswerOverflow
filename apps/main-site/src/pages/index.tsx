import type { GetStaticProps, InferGetStaticPropsType } from 'next';

import { Home } from '@answeroverflow/ui/src/components/pages/Home';
import {
	countConsentingUsersInManyServers,
	findAllServers,
	zServerPublic,
} from '@answeroverflow/db';
export const getStaticProps: GetStaticProps<{
	data: {
		name: string;
		id: string;
		icon: string | null;
	}[];
}> = async () => {
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
	return {
		props: {
			data: asPublic.map((server) => ({
				name: server.name,
				id: server.id,
				icon: server.icon,
			})),
		},
		revalidate: 60 * 10,
	};
};
// eslint-disable-next-line @typescript-eslint/naming-convention
export default function Page(
	props: InferGetStaticPropsType<typeof getStaticProps>,
) {
	return (
		<>
			<Home servers={props.data} />
		</>
	);
}
