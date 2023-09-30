import {
	useRouterQuery,
	useRouterServerId,
} from '@answeroverflow/ui/src/utils/hooks';
import AOHead from '@answeroverflow/ui/src/components/primitives/AOHead';
import { SearchPage } from '@answeroverflow/ui/src/components/pages/SearchPage';
import { trpc } from '@answeroverflow/ui/src/utils/trpc';

export default function Search() {
	// get the query from the url in the q param
	const routerQuery = useRouterQuery();
	const serverIdToFilterTo = useRouterServerId();
	const results = trpc.messages.search.useQuery(
		{
			query: routerQuery,
			serverId: serverIdToFilterTo,
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
