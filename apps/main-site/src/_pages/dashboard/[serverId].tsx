import { useRouter } from 'next/navigation';
// eslint-disable-next-line no-restricted-imports
import { ServerDashboard } from '@answeroverflow/ui/src/components/dashboard/dashboard';

export default function ServerIdDashboard() {
	const router = useRouter();
	const serverId = router.query.serverId as string | undefined;
	if (!serverId) {
		return null;
	}
	return <ServerDashboard serverId={serverId} />;
}
