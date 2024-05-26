'use client';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import { useDashboardContext } from './dashboard-context';
import { Chart } from '@typelytics/tremor';

type ChartData = {
	data: number[];
	aggregated_value: number;
	days: string[];
	labels: string[];
	label: string;
};

function getFakeData(opts: {
	min: number;
	max: number;
	to: Date;
	from: Date;
	label: string;
}): ChartData {
	const daysBetween = Math.round(
		(opts.to.getTime() - opts.from.getTime()) / (1000 * 60 * 60 * 24),
	);

	const days = Array.from(
		{ length: daysBetween },
		(
			_,
			i, // get in format of Day name, Month name abrv. Day number
		) => new Date(opts.from.getTime() + i * 1000 * 60 * 60 * 24),
	);
	const data = days.map(() =>
		Math.floor(Math.random() * (opts.max - opts.min) + opts.min),
	);
	return {
		aggregated_value: data.reduce((acc, curr) => acc + curr, 0),
		data: data,
		label: opts.label,
		days: days.map((date) =>
			date.toDateString().split(' ').slice(0, 3).join(' '),
		),
		labels: days.map((date) =>
			date.toDateString().split(' ').slice(0, 3).join(' '),
		),
	};
}

function usePageViews() {
	const { options } = useDashboardContext();
	return trpc.dashboard.pageViews.useQuery(options, {
		initialData:
			options.serverId === '1000'
				? {
						results: {
							'Page Views': getFakeData({
								min: 1000,
								max: 7000,
								to: options.to,
								from: options.from,
								label: 'Page Views',
							}),
						},
						type: 'line',
				  }
				: undefined,
		keepPreviousData: true,
	});
}

export function PageViewsLineChart() {
	const { data } = usePageViews();
	if (!data) return null;
	return (
		<div className="flex w-full flex-col gap-2 rounded-lg border-1 py-4">
			<span className="px-16 text-lg text-muted-foreground">Page Views</span>
			<span className="px-16 text-4xl">
				{data.results['Page Views'].aggregated_value.toLocaleString()}
			</span>
			<Chart {...data} showLegend={false} showGridLines={false} />
		</div>
	);
}

export function ServerInvitesUsedLineChart() {
	const { options } = useDashboardContext();
	const { data } = trpc.dashboard.serverInvitesClicked.useQuery(options, {
		refetchOnReconnect: false,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		initialData:
			options.serverId === '1000'
				? {
						results: {
							'Invite Clicked': getFakeData({
								min: 100,
								max: 400,
								to: options.to,
								from: options.from,
								label: 'Invite Clicked',
							}),
						},
						type: 'line',
				  }
				: undefined,
	});
	if (!data) return null;
	return <Chart {...data} />;
}
