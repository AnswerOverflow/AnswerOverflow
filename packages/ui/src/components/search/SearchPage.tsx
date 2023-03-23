import type { APISearchResult } from '@answeroverflow/api';
import { useState } from 'react';
import { Heading } from '../primitives/Heading';

import { SearchInput } from '~ui/components/primitives/Input';
import { SearchResult } from '~ui/components/search/SearchResult';
import { useRouter } from 'next/router';
import { useRouterQuery } from '~ui/utils/hooks';
import { twMerge } from 'tailwind-merge';

interface SearchResultProps {
	results: APISearchResult[number][];
	isLoading: boolean;
}

export const MessagesSearchBar = (props: {
	placeholder?: string;
	className?: string;
	serverId?: string;
}) => {
	const router = useRouter();
	const query = useRouterQuery();
	const [searchInput, setSearchInput] = useState<string>(query);
	console.log('searchInput: ', searchInput, query);
	return (
		<form
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onSubmit={async (e) => {
				e.preventDefault();
				const params = new URLSearchParams();
				params.set('q', searchInput);
				if (props.serverId) {
					params.set('s', props.serverId);
				}
				await router.push(`/search?${params.toString()}`, undefined, {
					shallow: true,
				});
			}}
			className={twMerge('mb-8 w-full', props.className)}
		>
			<SearchInput
				defaultValue={query || ''}
				className="w-full"
				onChange={(e) => setSearchInput(e.target.value)}
				placeholder={props.placeholder ?? 'Search'}
			/>
		</form>
	);
};
export const SearchPage = ({ results, isLoading }: SearchResultProps) => {
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
			<Heading.H1 className="py-4 text-3xl xl:text-5xl">Search</Heading.H1>
			<MessagesSearchBar />
			{resultsSection}
		</div>
	);
};
