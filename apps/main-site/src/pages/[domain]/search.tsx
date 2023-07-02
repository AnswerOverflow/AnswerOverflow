import {
	AOHead,
	SearchPage,
	trpc,
	useRouterQuery,
	useRouterServerId,
} from '@answeroverflow/ui';
import { findServerByCustomDomain, zServerPublic } from '@answeroverflow/db';
import { GetStaticPropsContext } from 'next';

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

export function getStaticPaths() {
	return { paths: [], fallback: 'blocking' };
}

export async function getStaticProps(
	context: GetStaticPropsContext<{ domain: string }>,
) {
	if (!context.params) {
		return {
			notFound: true,
		};
	}

	const domain = context.params.domain;
	const server = await findServerByCustomDomain(domain);
	if (!server) {
		return {
			notFound: true,
		};
	}

	return {
		props: {
			tenant: zServerPublic.parse(server),
		},
		revalidate: 60 * 10, // every 10 minutes
	};
}
