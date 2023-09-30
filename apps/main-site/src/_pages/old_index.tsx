import type { GetStaticProps, InferGetStaticPropsType } from 'next';

import { Home } from '@answeroverflow/ui/src/components/pages/Home';
import {
	countConsentingUsersInManyServers,
	findAllServers,
	zServerPublic,
} from '@answeroverflow/db';

// Yeah that's right I think these icons are ugly and I'm not afraid to say it
const UGLY_ICONS = new Set(['883929594179256350']);

export const getStaticProps: GetStaticProps<{
	data: {
		name: string;
		id: string;
		icon: string | null;
	}[];
}> = async () => {
	return {
		props: {
			data: asPublic
				.map((server) => ({
					name: server.name,
					id: server.id,
					icon: server.icon,
				}))
				.filter((server) => {
					if (server.icon === null) return false;
					if (UGLY_ICONS.has(server.id)) return false;
					return true;
				}),
		},
		revalidate: 60 * 10,
	};
};
