import {
	AOHead,
	SearchPage,
	trpc,
	useIsServer,
	useRouterQuery,
	useRouterServerId,
} from '@answeroverflow/ui';
import type { GetStaticPropsContext } from 'next';
import { findServerById, zServerPublic } from '@answeroverflow/db';

export default function Search() {
	// get the query from the url in the q param
	const routerQuery = useRouterQuery();
	const serverIdToFilterTo = useRouterServerId();
	const isServer = useIsServer();
	const results = trpc.messages.search.useQuery(
		{
			query: routerQuery,
			serverId: serverIdToFilterTo,
		},
		{
			enabled: routerQuery.length > 0 && !isServer,
			refetchOnMount: false,
			refetchOnReconnect: false,
			refetchOnWindowFocus: false,
		},
	);

	return (
		<>
			<AOHead
				description="Search Discord servers indexed on Answer Overflow"
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
	context: GetStaticPropsContext<{ communityId: string }>,
) {
	if (!context.params) {
		return {
			notFound: true,
		};
	}

	const serverId = context.params.communityId;
	const privateTenantData = await findServerById(serverId);
	console.log(privateTenantData);
	const publicTenantData = zServerPublic.parse(privateTenantData);
	return {
		props: {
			tenantData: publicTenantData,
		},
	};
}
