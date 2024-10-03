import { callAPI } from '@answeroverflow/ui/src/utils/trpc';
import { redirect } from 'next/navigation';

export default async function Onboarding() {
	const servers = await callAPI({
		apiCall: (api) => api.auth.getServersForOnboarding(),
	});
	const firstServer = servers.filter((x) => x.hasBot).pop();
	if (firstServer) {
		return redirect(`/dashboard/${firstServer.id}`);
	}
	return redirect('/onboarding');
}
