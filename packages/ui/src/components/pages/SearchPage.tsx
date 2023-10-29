import type { APISearchResult, ServerPublic } from '@answeroverflow/api';
import { Heading } from '../primitives/ui/heading';
import { SearchResult } from '../primitives/message/SearchResult';
import { MessagesSearchBar } from '../primitives/messages-search-bar';

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
			<Heading.H1 className="py-4 text-3xl xl:text-5xl">Search</Heading.H1>
			<MessagesSearchBar className={'mb-4'} />
			{!noResults && (
				<div className={'mb-4'}>
					<span className="text-base text-primary/[.6]">{resultsText}</span>
				</div>
			)}
			{resultsSection}
		</div>
	);
};
