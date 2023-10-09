'use client';
import type { APISearchResult } from '@answeroverflow/api';
import { Heading } from '~ui/components/primitives/base/Heading';
import { SearchResult } from '~ui/components/primitives/message/SearchResult';
import { MessagesSearchBar } from '~ui/components/primitives/messages-search-bar';

interface SearchResultProps {
	results: APISearchResult[number][];
	isLoading: boolean;
}

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

	const uniqueServers = new Set(results.map((result) => result.server.id));
	return (
		<div className="w-full">
			<Heading.H1 className="py-4 text-3xl xl:text-5xl">Search</Heading.H1>
			<MessagesSearchBar className={'mb-4'} />
			{!isLoading && !noResults && (
				<div className={'mb-4'}>
					<span className="text-base text-primary/[.6]">
						Found {results.length} result{results.length === 1 ? '' : 's'} from{' '}
						{uniqueServers.size}{' '}
						{uniqueServers.size === 1 ? 'community' : 'communities'}
					</span>
				</div>
			)}
			{resultsSection}
		</div>
	);
};
