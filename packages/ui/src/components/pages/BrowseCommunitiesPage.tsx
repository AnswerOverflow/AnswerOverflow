import type { ServerPublic } from '@answeroverflow/api';
import AOHead from '~ui/components/primitives/AOHead';
import { Heading } from '~ui/components/primitives/base/Heading';
import { ViewServerCard } from '~ui/components/primitives/ServerCard';
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
						<div
							key={`server-${server.id}-area`}
							className="w-full max-w-md rounded-md  p-4 transition-all"
						>
							<ViewServerCard server={server} />
						</div>
					);
				})}
			</div>
		</>
	);
};
