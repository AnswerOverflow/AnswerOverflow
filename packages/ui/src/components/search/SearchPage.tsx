import type { APISearchResult } from '@answeroverflow/api';
import { useState } from 'react';
import { Heading } from '../primitives/Heading';

import { Input } from '~ui/components/primitives/Input';
import { SearchResult } from '~ui/components/search/SearchResult';

interface SearchResultProps {
	results: APISearchResult[number][];
	isLoading: boolean;
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
			<div className="h-32 w-32 animate-spin rounded-full border-b-4 border-ao-blue" />
		</div>
	) : noResults ? (
		<div className="flex h-[50vh] items-center justify-center">
			<p className="font-header text-xl text-ao-black dark:text-ao-white">
				No results found
			</p>
		</div>
	) : (
		results.map((result) => (
			<div className="my-2" key={result.message.id}>
				<SearchResult result={result} />
			</div>
		))
	);

	return (
		<div className="w-full">
			<Heading.H1 classNameOverride="py-4 text-3xl xl:text-5xl">
				Search
			</Heading.H1>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					onSearch(searchInput);
				}}
				className="mb-8"
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
	);
};
