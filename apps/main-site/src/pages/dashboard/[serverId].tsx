import { useRouter } from 'next/router';

export default function ServerDashboard() {
	const router = useRouter();
	const serverId = router.query.serverId;
	return <div>Server Dashboard for {serverId}</div>;
}
