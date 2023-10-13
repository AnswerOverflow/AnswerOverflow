import { findServerByCustomDomain } from '@answeroverflow/db';
import { SearchPage } from '@answeroverflow/ui/src/components/pages/SearchPage';
import { callAPI } from '@answeroverflow/ui/src/utils/trpc';
import { notFound } from 'next/navigation';

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
	const results = await callAPI({
		apiCall: (api) =>
			api.messages.search({
				serverId: server.id,
				query: props.searchParams.q as string,
			}),
	});
	return <SearchPage results={results} isOnTenant={true} />;
}
