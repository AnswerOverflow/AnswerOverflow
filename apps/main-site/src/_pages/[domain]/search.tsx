import { findServerByCustomDomain, zServerPublic } from '@answeroverflow/db';
import { GetStaticPropsContext } from 'next';
import { useTenantContext } from '@answeroverflow/hooks';
import {
	useRouterQuery,
	useRouterServerId,
} from '@answeroverflow/ui/src/utils/hooks';
import AOHead from '@answeroverflow/ui/src/components/primitives/AOHead';
import { SearchPage } from '@answeroverflow/ui/src/components/pages/SearchPage';

export default async function Search() {
	// get the query from the url in the q param
	const routerQuery = useRouterQuery();
	const serverIdToFilterTo = useRouterServerId();
	const { tenant } = await useTenantContext();

	return (
		<>
			<AOHead
				description="Search Discord servers indexed on answer overflow"
				path="/search"
				title="Search"
			/>
			<SearchPage results={[]} isLoading={true} />
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
