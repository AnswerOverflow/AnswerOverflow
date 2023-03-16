import { AOHead, SearchPage, trpc } from '@answeroverflow/ui';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Search() {
	// get the query from the url in the q param
	const router = useRouter();
	const routerQuery = typeof router.query.q === 'string' ? router.query.q : '';
	const [query, setQuery] = useState<string>(routerQuery);
	const results = trpc.messages.search.useQuery(
		{
			query,
		},
		{
			enabled: query.length > 0,
			refetchOnMount: false,
			refetchOnReconnect: false,
			refetchOnWindowFocus: false,
		},
	);

	useEffect(() => {
		// if the query in the url changes, set the query in the state
		setQuery(routerQuery);
	}, [routerQuery]);

	return (
		<>
			<AOHead
				description="Search Discord servers indexed on answer overflow"
				path="/search"
				title="Search"
			/>
			<SearchPage
				results={results.data ?? []}
				isLoading={results.isLoading && query.length > 0}
				onSearch={async (query: string) => {
					// set the query in the url
					await router.push(`/search?q=${query}`, undefined, {
						shallow: true,
					});
					// set the query in the state
					// setQuery(query);
				}}
			/>
		</>
	);
}
