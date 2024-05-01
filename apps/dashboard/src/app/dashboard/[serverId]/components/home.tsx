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

function randomSeeded(seed: number = 1) {
	const x = Math.sin(seed++) * 10000;
	return x - Math.floor(x);
}

function getFakeData(opts: {
	min: number;
	max: number;
	to: Date;
	from: Date;
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
	const data = days.map((day) =>
		Math.floor(randomSeeded(day.getTime()) * (opts.max - opts.min) + opts.min),
	);
	return {
		aggregated_value: data.reduce((acc, curr) => acc + curr, 0),
		data: data,
		label: 'Page Views',
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
