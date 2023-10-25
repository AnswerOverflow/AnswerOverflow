import { Home } from '@answeroverflow/ui/src/components/pages/Home';
import { Metadata } from 'next';
import { fetchBrowseServers } from '../data/browse';
const UGLY_ICONS = new Set(['883929594179256350']);
export const metadata: Metadata = {
	alternates: {
		canonical: '/',
	},
};

export default async function HomePage() {
	const data = await fetchBrowseServers();
	return (
		<Home
			servers={data.filter(
				(server) => server.icon && !UGLY_ICONS.has(server.id),
			)}
		/>
	);
}
