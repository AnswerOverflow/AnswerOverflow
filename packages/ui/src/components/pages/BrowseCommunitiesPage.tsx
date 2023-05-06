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

			<Heading.H1 className="my-16 text-4xl md:text-5xl">
				Browse Communities
			</Heading.H1>
			<div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{servers.map((server) => {
					return (
						<FollowCursor
							key={`server-${server.id}-area`}
							className="w-full justify-self-center rounded-md bg-ao-black/[0.03] p-4 drop-shadow-xl hover:scale-105 dark:bg-ao-white/[0.01] md:max-w-sm"
						>
							<ViewServerCard server={server} />
						</FollowCursor>
					);
				})}
			</div>
		</>
	);
};
