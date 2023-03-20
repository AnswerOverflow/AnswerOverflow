import { AOHead, SearchPage, trpc, useRouterQuery } from '@answeroverflow/ui';

export default function Search() {
	// get the query from the url in the q param
	const routerQuery = useRouterQuery();
	const results = trpc.messages.search.useQuery(
		{
			query: routerQuery,
		},
		{
			enabled: routerQuery.length > 0,
			refetchOnMount: false,
			refetchOnReconnect: false,
			refetchOnWindowFocus: false,
		},
	);

	return (
		<>
			<AOHead
				description="Search Discord servers indexed on answer overflow"
				path="/search"
				title="Search"
			/>
			<SearchPage
				results={results.data ?? []}
				isLoading={results.isLoading && routerQuery.length > 0}
			/>
		</>
	);
}
