'use client';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
	const { data } = trpc.auth.getServersForOnboarding.useQuery();
	const serversWithDashboard = data?.filter((server) => server.hasBot);
	const selectedServer = serversWithDashboard?.[0];
	// redirect to selected server
	const router = useRouter();
	if (selectedServer) {
		router.push(`/dashboard/${selectedServer.id}`);
	}
}
