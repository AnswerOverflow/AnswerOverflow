import { BrowseCommunitiesPage } from '@answeroverflow/ui/src/components/pages/BrowseCommunitiesPage';
import type { ServerPublic } from '~api/router/server/types';
import { trpc } from '@answeroverflow/ui';

export default function BrowseCommunitiesPageWeb({
	servers,
}: {
	servers: ServerPublic[];
}) {
	return <BrowseCommunitiesPage servers={servers} />;
}

export function getServerSideProps() {
	const servers = trpc.servers.getAllServers.useQuery().data;

	return {
		props: {
			servers: servers,
		}, // will be passed to the page component as props
	};
}
