import { useRouter } from 'next/router';
// eslint-disable-next-line no-restricted-imports
import { ServerDashboard } from '../../components/dashboard';

export default function ServerIdDashboard() {
	const router = useRouter();
	const serverId = router.query.serverId as string;
	return <ServerDashboard serverId={serverId} />;
}
