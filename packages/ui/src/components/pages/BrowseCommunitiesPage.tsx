import type { ServerPublic } from '~api/router/server/types';
import { AOHead, Footer, Heading, ServerCard, Navbar } from '../primitives';

const MainContent = ({ servers }: { servers: ServerPublic[] }) => {
	return (
		<div className="px-4 2xl:px-[6rem]">
			<Heading.H1 className="mb-16">Browse Communities</Heading.H1>
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
		</div>
	);
};

interface BrowseCommunitiesPageProps {
	servers: ServerPublic[];
}

export const BrowseCommunitiesPage = ({
	servers,
}: BrowseCommunitiesPageProps) => {
	return (
		<div className="mx-auto w-full overflow-x-hidden overflow-y-scroll bg-ao-white scrollbar-hide dark:bg-ao-black">
			<Navbar />
			<main className="mb-24 mt-8 bg-ao-white dark:bg-ao-black">
				<AOHead
					title="Browse Communities On Answer Overflow"
					description="Browse communities on Answer Overflow."
					path="/communities"
				/>

				<MainContent servers={servers} />
			</main>
			<Footer />
		</div>
	);
};
