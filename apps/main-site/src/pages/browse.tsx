'use server';
import { BrowseCommunitiesPage } from '@answeroverflow/ui/src/components/pages/BrowseCommunitiesPage';
import { findAllServers } from '@answeroverflow/db';

const BrowseCommunitiesPageWeb = async () => {
	const servers = (await findAllServers()).filter(
		(server) => server.kickedTime !== null,
	);

	return <BrowseCommunitiesPage servers={servers} />;
};

export default BrowseCommunitiesPageWeb;
