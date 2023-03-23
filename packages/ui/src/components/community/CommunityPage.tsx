import type { CommunityPageData } from '@answeroverflow/db';
import { Footer } from '../Footer';
import { Button } from '../primitives/Button';
import { Heading } from '../primitives/Heading';
import { Navbar } from '../primitives/Navbar';
import { MessagesSearchBar } from '../search/SearchPage';
import { ServerIcon } from '../ServerIcon';

export const CommunityPage = ({ server }: CommunityPageData) => {
	return (
		<div className="mx-auto w-full overflow-y-scroll bg-ao-white scrollbar-hide overflow-x-hidden dark:bg-ao-black">
			<Navbar />
			<main className="bg-ao-white dark:bg-ao-black">
				<div className="flex flex-col">
					<div className="my-auto flex flex-row bg-gradient-to-r from-[#7196CD] to-[#82adbe] px-4 py-8 dark:to-[#113360] sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
						<ServerIcon server={server} size="xl" className="hidden sm:flex" />
						<div className="ml-16 flex flex-col">
							<Heading.H1 className="pt-0">{server.name}</Heading.H1>
							<Heading.H2 className="text-xl font-normal">
								{server.description ??
									`${server.name} community. Join the community to ask questions about ${server.name} and get answers from other members.`}
							</Heading.H2>
							<Button className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0">
								Join Server
							</Button>
						</div>
					</div>
				</div>

				<div className="py-8 sm:px-4">
					<div className="px-4 2xl:px-[6rem]">
						<MessagesSearchBar
							placeholder={`Search the ${server.name} community`}
							serverId={server.id}
						/>

						<Heading.H3>Community questions</Heading.H3>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
