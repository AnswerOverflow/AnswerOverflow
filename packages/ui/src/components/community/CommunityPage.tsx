import type { APISearchResult, ServerPublic } from '@answeroverflow/api';
import { useState } from 'react';
import { Footer } from '../Footer';
import { Button } from '../primitives/Button';
import { Heading } from '../primitives/Heading';
import { Input } from '../primitives/Input';
import { Navbar } from '../primitives/Navbar';
import { SearchResult } from '../search/SearchResult';
import { ServerIcon } from '../ServerIcon';

interface CommunityPageResultsProps {
	results: APISearchResult[number][];
	server: ServerPublic;
	isLoading: boolean;
	onSearch: (query: string) => Promise<unknown> | unknown;
}

export const CommunityPage = ({
	results,
	isLoading,
	onSearch,
	server,
}: CommunityPageResultsProps) => {
	const [textSearchInput, setTextSearchInput] = useState<string>('');

	return (
		<div className="mx-auto w-full overflow-y-scroll bg-ao-white scrollbar-hide overflow-x-hidden dark:bg-ao-black">
			<Navbar additionalPadding />
			<main className="bg-ao-white dark:bg-ao-black">
				<div className="flex flex-col">
					<div className="my-auto flex flex-row bg-gradient-to-r from-[#7196CD] to-[#113360] px-4 py-8 sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
						<ServerIcon server={server} size="xl" className="hidden sm:flex" />
						<div className="ml-16 flex flex-col">
							<Heading.H1 className="pt-0">Reactiflux</Heading.H1>
							<Heading.H2 className="text-xl font-normal">
								Reactiflux is a community of developers who use React and
								related technologies.
							</Heading.H2>
							<Button className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0">
								Join Server
							</Button>
						</div>
					</div>
				</div>

				<div className="py-8 sm:px-4">
					<div className="px-4 2xl:px-[6rem]">
						<Input
							onChange={setTextSearchInput}
							buttonAria="Search button"
							type="buttonInput"
							fill
							placeholder="Search"
						>
							Search
						</Input>

						<div className="mt-4">
							{results.map((result) => (
								<div className="my-2" key={result.message.id}>
									<SearchResult result={result} />
								</div>
							))}
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
