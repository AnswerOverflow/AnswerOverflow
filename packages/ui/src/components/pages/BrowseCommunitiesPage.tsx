import type { ServerPublic } from '~api/router/server/types';
import {
	AOHead,
	Button,
	Footer,
	Heading,
	LinkButton,
	LockIcon,
	Navbar,
	ServerIcon,
} from '../primitives';

const ServerArea = ({ server }: { server: ServerPublic }) => {
	return (
		<div className="flex flex-col rounded-standard bg-ao-black/5 px-8 py-4 dark:bg-ao-white/5">
			<div className="flex flex-row items-center justify-between">
				<ServerIcon server={server} />
				{server.vanityUrl ? (
					<LinkButton
						href={`https://discord.gg/${server.vanityUrl}`}
						variant="default"
					>
						Join Server
					</LinkButton>
				) : (
					<Button disabled>
						<LockIcon className="mr-1 h-6 w-6" />
						Private Server
					</Button>
				)}
			</div>
			<Heading.H2 className="pt-4">{server.name}</Heading.H2>
		</div>
	);
};

const MainContent = ({ servers }: { servers: ServerPublic[] }) => {
	return (
		<div className="px-4 2xl:px-[6rem]">
			<Heading.H1 className="mb-16">Browse Communities</Heading.H1>
			<div className="grid grid-cols-4 gap-x-4 gap-y-8">
				{servers.map((server) => {
					return (
						<ServerArea server={server} key={`server-${server.id}-area`} />
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
			<main className="bg-ao-white dark:bg-ao-black">
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
