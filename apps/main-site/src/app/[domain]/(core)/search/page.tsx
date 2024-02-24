import { findServerByCustomDomain } from '@answeroverflow/db';
import { SearchPage } from '@answeroverflow/ui/src/components/pages/SearchPage';
import { callAPI } from '@answeroverflow/ui/src/utils/trpc';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
type Props = {
	searchParams: {
		q?: string | string[];
	};
};

export function generateMetadata({ searchParams }: Props): Metadata {
	const query = searchParams.q ? (searchParams.q as string) : undefined;
	return {
		title: query ? `Search Results for "${query}"` : 'Search - Answer Overflow',
		openGraph: {
			title: query
				? `Search Results for "${query}"`
				: 'Search - Answer Overflow',
		},
	};
}

export default async function Search(props: {
	searchParams: {
		q?: string | string[];
	};
	params: {
		domain: string;
	};
}) {
	const server = await findServerByCustomDomain(
		decodeURIComponent(props.params.domain),
	);
	if (!server) {
		return notFound();
	}
	if (!props.searchParams.q) {
		return <SearchPage results={undefined} tenant={server} />;
	}

	const results = await callAPI({
		apiCall: (api) =>
			api.messages.search({
				serverId: server.id,
				query: props.searchParams.q ? (props.searchParams.q as string) : '',
			}),
	});
	return <SearchPage results={results} tenant={server} />;
}
