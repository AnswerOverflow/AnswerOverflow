'use client';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import { DatePickerWithPresets } from '@answeroverflow/ui/src/ui/date-picker';
import { DashboardProvider } from './components/dashboard-context';
import {
	PageViewsLineChart,
	PageViewsTotalCard,
	ServerInvitesClickedTotalCard,
} from './components/home';
import { demoServerData } from './components/mock';

export default function Dashboard(props: { params: { serverId: string } }) {
	const { data } = trpc.servers.byId.useQuery(props.params.serverId, {
		initialData: props.params.serverId === '1000' ? demoServerData : undefined,
	});
	if (!data) return null;
	return (
		<div>
			<DashboardProvider
				value={{
					options: {
						serverId: data.id,
						from: new Date(new Date().setDate(new Date().getDate() - 7)),
						to: new Date(),
					},
					server: data,
				}}
			>
				<DatePickerWithPresets />
				<div>
					<div className="flex flex-row justify-start">
						<PageViewsTotalCard />
						<ServerInvitesClickedTotalCard />
					</div>
					<PageViewsLineChart />
				</div>
			</DashboardProvider>
		</div>
	);
}
