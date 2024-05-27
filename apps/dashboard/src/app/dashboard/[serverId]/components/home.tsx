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
						type: 'area',
				  }
				: undefined,
		keepPreviousData: true,
	});
}

function ChartWithLabelAndTotal(props: {
	label: React.ReactNode;
	description?: React.ReactNode;
	chart: React.ReactNode;
}) {
	return (
		<div className="flex w-full flex-col gap-4 rounded-lg border-1 py-4">
			<span className="pl-6 text-start font-semibold">{props.label}</span>
			{props.chart}
		</div>
	);
}

export function PageViewsLineChart() {
	const { data } = usePageViews();
	if (!data) return null;
	return (
		<ChartWithLabelAndTotal
			label={`Page Views: ${data.results[
				'Page Views'
			].aggregated_value.toLocaleString()}`}
			chart={
				<Chart
					{...data}
					showLegend={false}
					className="text-muted-foreground"
					valueFormatter={(value) => value.toLocaleString()}
				/>
			}
		/>
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
						type: 'bar',
				  }
				: undefined,
	});
	if (!data) return null;
	return (
		<ChartWithLabelAndTotal
			label={`Server Invites Used: ${data.results[
				'Invite Clicked'
			].aggregated_value.toLocaleString()}`}
			chart={
				<Chart
					{...data}
					showLegend={false}
					className="text-muted-foreground"
					valueFormatter={(value) => value.toLocaleString()}
				/>
			}
		/>
	);
}

export function QuestionsAndAnswersLineChart() {
	const { options } = useDashboardContext();
	const { data } = trpc.dashboard.questionsAndAnswers.useQuery(options, {
		refetchOnWindowFocus: true,
	});
	if (!data) return null;
	return (
		<ChartWithLabelAndTotal
			label={`Questions & Answers`}
			description={`${data.results['Questions Asked'].aggregated_value} Questions & ${data.results['Questions Solved'].aggregated_value} Answers`}
			chart={<Chart {...data} colors={['blue', 'green']} />}
		/>
	);
}

export function TopQuestionSolversTable() {
	const { options } = useDashboardContext();
	const { data } = trpc.dashboard.topQuestionSolvers.useQuery(options, {
		refetchOnWindowFocus: true,
	});
	if (!data) return null;
	return (
		<ChartWithLabelAndTotal
			label={`Top Question Solvers`}
			chart={
				<div className="max-h-[400px] overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr>
								<th>Discord Account</th>
								<th>Questions Solved</th>
							</tr>
						</thead>
						<tbody>
							{data.map((row) => (
								<tr key={row.id}>
									<td>{row.name}</td>
									<td>{row.questionsSolved}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			}
		/>
	);
}
