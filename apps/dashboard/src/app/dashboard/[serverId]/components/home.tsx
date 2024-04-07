import { trpc } from 'packages/ui/src/utils/client';
import { useDashboardContext } from './dashboard-context';
import { Chart } from '@typelytics/tremor';

function usePageViews() {
	const { options } = useDashboardContext();
	return trpc.dashboard.pageViews.useQuery(options, {
		refetchOnReconnect: false,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		initialData:
			options.serverId === '1000'
				? {
						results: {
							'Page Views': {
								aggregated_value: 3000,
								data: [200, 300, 500, 200, 300, 600, 200],
								label: 'Page Views',
								days: [
									'Day 1',
									'Day 2',
									'Day 3',
									'Day 4',
									'Day 5',
									'Day 6',
									'Day 7',
								],
								labels: [
									'Day 1',
									'Day 2',
									'Day 3',
									'Day 4',
									'Day 5',
									'Day 6',
									'Day 7',
								],
							},
						},
						type: 'line',
				  }
				: undefined,
	});
}

export function PageViewsLineChart() {
	const { data } = usePageViews();
	if (!data) return null;
	return <Chart {...data} />;
}

export function PageViewsTotalCard() {
	const { data } = usePageViews();
	if (!data) return null;
	return <Chart type={'number'} results={data.results} />;
}

export function ServerInvitesClickedTotalCard() {
	const { options } = useDashboardContext();
	const { data } = trpc.dashboard.serverInvitesClicked.useQuery(options, {
		refetchOnReconnect: false,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});
	if (!data) return null;
	return <Chart {...data} />;
}
