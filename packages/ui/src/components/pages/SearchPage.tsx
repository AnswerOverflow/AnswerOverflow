import type { APISearchResult } from '@answeroverflow/api';
import { useState } from 'react';
import { Heading } from '~ui/components/primitives/base/Heading';
import { useRouter } from 'next/router';
import { useRouterQuery, useRouterServerId } from '~ui/utils/hooks';
import { twMerge } from 'tailwind-merge';
import { Input } from '~ui/components/primitives/ui/input';
import { SearchResult } from '~ui/components/primitives/SearchResult';

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
	const serverId = useRouterServerId();
	const [searchInput, setSearchInput] = useState<string>(query);
	return (
		<form
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onSubmit={async (e) => {
				e.preventDefault();
				const params = new URLSearchParams();
				params.set('q', searchInput);
				const serverIdToFilterTo = props.serverId ?? serverId;
				if (serverIdToFilterTo) {
					params.set('s', serverIdToFilterTo);
				}
				await router.push(`/search?${params.toString()}`, undefined, {
					shallow: true,
				});
			}}
			className={twMerge('w-full', props.className)}
		>
			<Input
				defaultValue={query || ''}
				className="mb-4 w-full"
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
			<div className="h-32 w-32 animate-spin rounded-full border-b-4" />
		</div>
	) : noResults ? (
		<div className="flex h-[50vh] items-center justify-center">
			<p className="font-header text-xl">No results found</p>
		</div>
	) : (
		results.map((result) => (
			<div className="mb-8" key={result.message.id}>
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
