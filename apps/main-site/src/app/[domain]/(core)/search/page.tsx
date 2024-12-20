import { findServerByCustomDomain } from '@answeroverflow/core/server';
import { SearchPage } from '@answeroverflow/ui/pages/SearchPage';
import { callAPI } from '@answeroverflow/ui/utils/trpc';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
type Props = {
	searchParams: Promise<{
		q?: string | string[];
	}>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const searchParams = await props.searchParams;
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
	searchParams: Promise<{
		q?: string | string[];
	}>;
	params: Promise<{
		domain: string;
	}>;
}) {
	const searchParams = await props.searchParams;
	const server = await findServerByCustomDomain(
		decodeURIComponent((await props.params).domain),
	);
	if (!server) {
		return notFound();
	}
	if (!searchParams.q) {
		return <SearchPage results={[]} tenant={server} />;
	}

	const results = await callAPI({
		apiCall: (api) =>
			api.messages.search({
				serverId: server.id,
				query: searchParams.q ? (searchParams.q as string) : '',
			}),
	});
	return <SearchPage results={results} tenant={server} />;
}
