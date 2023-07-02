import { DomainResponse, DomainVerificationStatusProps } from './types';

export function useDomainStatus({ domain }: { domain: string }) {
	const status: DomainVerificationStatusProps =
		'Domain Not Found' as DomainVerificationStatusProps;
	const isValidating = false;
	const data: DomainResponse & {
		error: {
			code: string;
			message: string;
		};
	} = {
		apexName: 'apexName',
		name: 'name',
		projectId: 'projectId',
		verification: [],
		verified: false,
		error: {
			code: 'code',
			message: 'message',
		},
	};

	return {
		status: status,
		domainJson: data,
		loading: isValidating,
	};
}
