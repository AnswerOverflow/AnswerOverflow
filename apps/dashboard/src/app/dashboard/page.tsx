'use client';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import { ServerDashboard } from './_components/dashboard';
import { GetStarted } from '@answeroverflow/ui/src/callouts';

export default function Dashboard() {
	const { data, status } = trpc.auth.getServersForOnboarding.useQuery();
	const serversWithDashboard = data?.filter((server) => server.hasBot);
	const selectedServer = serversWithDashboard?.[0];

	switch (status) {
		case 'loading':
			return (
				<div className="flex h-[50vh] items-center justify-center">
					<div className="size-32 animate-spin rounded-full border-b-4 border-blue-400" />
				</div>
			);
		case 'error':
			return <div>Error</div>;
	}
	return selectedServer ? (
		<ServerDashboard serverId={selectedServer.id} />
	) : (
		<div className="flex h-screen flex-col items-center justify-center">
			<div className="text-4xl font-bold">No servers with bot found</div>
			<div className="text-2xl">Add the bot to a server to get started</div>
			<GetStarted className="mt-6" location="Pricing" />
		</div>
	);
}
