import { LuAlertCircle, LuCheckCircle2, LuXCircle } from 'react-icons/lu';
import { LoadingSpinner } from '@answeroverflow/ui';
import { useDomainStatus } from './use-domain-status';

export default function DomainStatus({ domain }: { domain: string }) {
	const { status, loading } = useDomainStatus({ domain });

	return (
		<div className="absolute right-3 z-10 flex h-full items-center">
			{loading ? (
				<LoadingSpinner />
			) : status === 'Valid Configuration' ? (
				<LuCheckCircle2 fill="#2563EB" stroke="white" />
			) : status === 'Pending Verification' ? (
				<LuAlertCircle fill="#FBBF24" stroke="white" />
			) : (
				<LuXCircle fill="#DC2626" stroke="white" />
			)}
		</div>
	);
}
