import type { APISearchResult } from '@answeroverflow/api';
import { useState } from 'react';

import { Input } from '~ui/components/primitives/Input';
import { SearchResultWrapper } from '~ui/components/search/SearchResult';
import { Navbar } from '../primitives/Navbar';

interface SearchResultProps {
	results?: APISearchResult[number][];
}

export const SearchPage = ({ results }: SearchResultProps) => {
	const [searchInput, setSearchInput] = useState<string>('');

	return (
		<div className="min-h-screen w-full bg-ao-white dark:bg-ao-black">
			<Navbar />
			<div className="w-full px-[4rem] 2xl:px-[6rem]">
				<h1 className="py-4 font-header text-3xl text-ao-black dark:text-ao-white xl:text-5xl">
					Search
				</h1>
				<Input
					onChange={setSearchInput}
					buttonAria="Search button"
					type="buttonInput"
					fill
					placeholder="Search"
				>
					Search
				</Input>

				{/* Search */}
				{results &&
					results.map((result) => {
						return <SearchResultWrapper result={result} />;
					})}
			</div>
		</div>
	);
};
