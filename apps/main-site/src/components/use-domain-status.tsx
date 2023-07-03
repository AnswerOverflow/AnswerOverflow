import { trpc } from '@answeroverflow/ui';

export function useDomainStatus({ domain }: { domain?: string }) {
	const { data, isLoading, isFetching } =
		trpc.servers.verifyCustomDomain.useQuery(domain ?? '', {
			refetchOnMount: true,
			refetchInterval: 5000,
			keepPreviousData: true,
			enabled: domain !== undefined,
		});

	return {
		status: data?.status,
		domainJson: data?.domainJson,
		loading: isLoading,
		fetching: isFetching,
	};
}
