import { SearchPage } from '@answeroverflow/ui/src/pages/SearchPage';
import { callAPI } from '@answeroverflow/ui/src/utils/trpc';
import { Metadata } from 'next';
type Props = {
	searchParams: {
		q?: string | string[];
		s?: string | string[];
	};
};

export function generateMetadata({ searchParams }: Props): Metadata {
	const query = searchParams.q ? (searchParams.q as string) : undefined;
	return {
		title: query
			? `Search Results for "${query}" - Answer Overflow`
			: 'Search - Answer Overflow',
		description: 'Search for answers to your questions on Answer Overflow.',
		openGraph: {
			title: query
				? `Search Results for "${query}" - Answer Overflow`
				: 'Search - Answer Overflow',
			description: 'Search for answers to your questions on Answer Overflow.',
		},
	};
}

export default async function Search(props: Props) {
	if (!props.searchParams.q && !props.searchParams.s) {
		return <SearchPage results={[]} tenant={undefined} />;
	}

	const results = await callAPI({
		apiCall: (api) =>
			api.messages.search({
				query: props.searchParams.q ? (props.searchParams.q as string) : '',
				serverId: props.searchParams.s
					? (props.searchParams.s as string)
					: undefined,
			}),
	});
	return <SearchPage results={results} tenant={undefined} />;
}
