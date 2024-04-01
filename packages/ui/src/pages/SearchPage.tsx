import type { APISearchResult, ServerPublic } from '@answeroverflow/api';
import { Heading } from '../ui/heading';
import { SearchResult } from '../message/SearchResult';

interface SearchResultProps {
	results: APISearchResult[number][];
	tenant: ServerPublic | undefined;
}

export const SearchPage = ({ results, tenant }: SearchResultProps) => {
	const noResults = results.length === 0;
	const resultsSection = results.map((result) => (
		<div className="mb-8" key={result.message.id}>
			<SearchResult result={result} />
		</div>
	));

	const uniqueServers = new Set(results.map((result) => result.server.id));
	const resultsText = [
		`Found ${results.length} result${results.length === 1 ? '' : 's'}`,
		tenant
			? ''
			: `from ${uniqueServers.size} ${
					uniqueServers.size === 1 ? 'community' : 'communities'
			  }`,
	].join(' ');
	return (
		<div className="w-full">
			<Heading.H1 className="py-4 text-xl">Search Results</Heading.H1>
			{!noResults && (
				<div className={'mb-4'}>
					<span className="text-base text-primary/[.6]">{resultsText}</span>
				</div>
			)}
			{resultsSection}
		</div>
	);
};
