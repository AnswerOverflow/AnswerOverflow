import type { APISearchResult } from '@answeroverflow/api';
import { useState } from 'react';

import { Input } from '~ui/components/primitives/Input';
import { SearchResult } from '~ui/components/search/SearchResult';
import { Navbar } from '../primitives/Navbar';

interface SearchResultProps {
	results?: APISearchResult[number][];
	isLoading?: boolean;
	onSearch: (query: string) => Promise<unknown> | unknown;
}

export const SearchPage = ({
	results,
	onSearch,
	isLoading,
}: SearchResultProps) => {
	const [searchInput, setSearchInput] = useState<string>('');

	const noResults = !results || results.length === 0;
	const resultsSection = isLoading ? (
		<div className="flex h-[50vh] items-center justify-center">
			<div className="h-64 w-64 animate-spin rounded-full border-b-4 border-ao-blue" />
		</div>
	) : noResults ? (
		<div className="flex h-[50vh] items-center justify-center">
			<p className="font-header text-xl text-ao-black dark:text-ao-white">
				No results found
			</p>
		</div>
	) : (
		results.map((result) => (
			<div className="my-2">
				<SearchResult result={result} />
			</div>
		))
	);

	return (
		<div className="min-h-screen w-full bg-ao-white dark:bg-ao-black">
			<Navbar />
			<div className="w-full px-[4rem] 2xl:px-[6rem]">
				<h1 className="py-4 font-header text-3xl text-ao-black dark:text-ao-white xl:text-5xl">
					Search
				</h1>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onSearch(searchInput);
					}}
				>
					<Input
						onChange={setSearchInput}
						buttonAria="Search button"
						type="buttonInput"
						fill
						placeholder="Search"
					>
						Search
					</Input>
				</form>
				{resultsSection}
			</div>
		</div>
	);
};
