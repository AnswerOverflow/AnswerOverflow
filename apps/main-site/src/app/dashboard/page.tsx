// import { ServerDashboard } from '@answeroverflow/ui/src/components/dashboard/dashboard';
import { GetStarted } from '@answeroverflow/ui/src/components/primitives/Callouts';
import { callAPI } from '@answeroverflow/ui/src/utils/trpc';

export default async function Dashboard() {
	return <></>;
	// const data = await callAPI({
	// 	apiCall: (api) => api.auth.getServersForOnboarding(),
	// });
	// const serversWithDashboard = data.filter((server) => server.hasBot);
	// const selectedServer = serversWithDashboard?.[0];
	// // TODO: Parallel routes
	// return selectedServer ? (
	//   <></>
	// 	// <ServerDashboard serverId={selectedServer.id} />
	// ) : (
	// 	<div className="flex h-screen flex-col items-center justify-center">
	// 		<div className="text-4xl font-bold">No servers with bot found</div>
	// 		<div className="text-2xl">Add the bot to a server to get started</div>
	// 		<GetStarted className="mt-6" location="Pricing" />
	// 	</div>
	// );
}
