import type { ServerPublic } from '~api/router/server/types';
import { AOHead, Heading, ViewServerCard } from '../primitives';
import { FollowCursor } from '../primitives/Follow';

interface BrowseCommunitiesPageProps {
	servers: ServerPublic[];
}

export const BrowseCommunitiesRenderer = ({
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
			<div className="grid grid-cols-4 gap-12">
				{servers.map((server) => {
					return (
						<FollowCursor
							key={`server-${server.id}-area`}
							className="rounded-md bg-neutral-900 p-4 drop-shadow-xl hover:scale-105"
						>
							<ViewServerCard server={server} />
						</FollowCursor>
					);
				})}
			</div>
		</>
	);
};
