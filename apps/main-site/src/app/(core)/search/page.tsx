import { useRouterQuery, useRouterServerId } from '~ui/utils/hooks';

// import { SearchPage } from '~ui/components/pages/SearchPage';
// import { trpc } from '@answeroverflow/ui/src/utils/trpc';

export default function Page() {
	// get the query from the url in the q param
	// const routerQuery = useRouterQuery();
	// const serverIdToFilterTo = useRouterServerId();
	// const results = trpc.messages.search.useQuery(
	// 	{
	// 		query: routerQuery,
	// 		serverId: serverIdToFilterTo,
	// 	},
	// 	{
	// 		enabled: routerQuery.length > 0,
	// 		refetchOnMount: false,
	// 		refetchOnReconnect: false,
	// 		refetchOnWindowFocus: false,
	// 	},
	// );

	return (
		<>
			{/*<SearchPage*/}
			{/*	results={results.data ?? []}*/}
			{/*	isLoading={results.isLoading && routerQuery.length > 0}*/}
			{/*/>*/}
		</>
	);
}
