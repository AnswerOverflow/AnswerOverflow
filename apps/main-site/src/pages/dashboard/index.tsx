import { GetStarted, trpc } from '@answeroverflow/ui';
// eslint-disable-next-line no-restricted-imports
import { ServerDashboard } from '../../components/dashboard';

export default function Dashboard() {
	const { data } = trpc.auth.getServersForOnboarding.useQuery();
	const serversWithDashboard = data?.filter((server) => server.hasBot);
	const selectedServer = serversWithDashboard?.[0];
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
