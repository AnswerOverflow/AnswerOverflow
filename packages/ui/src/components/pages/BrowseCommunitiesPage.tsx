import type { ServerPublic } from '~api/router/server/types';
import { AOHead, Heading, ServerCard } from '../primitives';

interface BrowseCommunitiesPageProps {
	servers: ServerPublic[];
}

export const BrowseCommunitiesPage = ({
	servers,
}: BrowseCommunitiesPageProps) => {
	return (
		<>
			<AOHead
				title="Browse Communities On Answer Overflow"
				description="Browse communities on Answer Overflow."
				path="/communities"
			/>

			<Heading.H1 className="my-16">Browse Communities</Heading.H1>
			<div className="grid grid-cols-4 gap-x-4 gap-y-8">
				{servers.map((server) => {
					return (
						<ServerCard
							server={server}
							key={`server-${server.id}-area`}
							type="join"
						/>
					);
				})}
			</div>
		</>
	);
};
