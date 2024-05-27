'use client';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import { useDashboardContext } from './dashboard-context';
import { Chart } from '@typelytics/tremor';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@answeroverflow/ui/src/ui/table';
import { DiscordAvatar } from '@answeroverflow/ui/src/discord-avatar';
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
			label={`Server Invite Clicks: ${data.results[
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
	const { data } = trpc.dashboard.questionsAndAnswers.useQuery(options);
	if (!data) return null;
	return (
		<ChartWithLabelAndTotal
			label={`Questions & Answers`}
			description={`${data.results['Questions Asked'].aggregated_value} Questions & ${data.results['Questions Solved'].aggregated_value} Answers`}
			chart={<Chart {...data} colors={['blue', 'green']} />}
		/>
	);
}
import { GoLinkExternal } from 'react-icons/go';
import Link from '@answeroverflow/ui/src/ui/link';
import { trackEvent } from '@answeroverflow/hooks';
import { toast } from 'react-toastify';
import { Textarea } from '@answeroverflow/ui/src/ui/textarea';
import { Button } from '@answeroverflow/ui/src/ui/button';

function ExternalLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<Link
			href={href}
			className=" group flex flex-row items-center gap-2 hover:underline"
			target="_blank"
		>
			{children}
			<GoLinkExternal className="hidden group-hover:block" />
		</Link>
	);
}

export function TopQuestionSolversTable() {
	const { options } = useDashboardContext();
	const { data } = trpc.dashboard.topQuestionSolvers.useQuery(options);
	if (!data) return null;
	return (
		<ChartWithLabelAndTotal
			label={`Top Question Solvers`}
			chart={
				<Table divClassName="max-h-[400px] px-4">
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead className="text-right">Solved</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((user) => (
							<TableRow key={user.avatar}>
								<TableCell className=" flex flex-row gap-2">
									<ExternalLink
										href={`https://www.answeroverflow.com/u/${user.id}`}
									>
										<DiscordAvatar user={user} size={24} />
										{user.name}
									</ExternalLink>
								</TableCell>
								<TableCell className="text-right">
									{user.questionsSolved}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			}
		/>
	);
}

export function PopularPagesTable() {
	const { options } = useDashboardContext();
	const { data } = trpc.dashboard.topPages.useQuery(options);
	if (!data) return null;
	return (
		<ChartWithLabelAndTotal
			label={`Popular Pages`}
			chart={
				<Table divClassName="max-h-[400px] px-4">
					<TableHeader>
						<TableRow>
							<TableHead>Page</TableHead>
							<TableHead className="text-right">Views</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((page) => (
							<TableRow key={page.id}>
								<TableCell>
									<ExternalLink
										href={`https://www.answeroverflow.com/m/${page.id}`}
									>
										{page.name}
									</ExternalLink>
								</TableCell>
								<TableCell className="text-right">{page.views}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			}
		/>
	);
}

export function RequestAnInsight() {
	const { data } = trpc.auth.getSession.useQuery();

	return (
		<ChartWithLabelAndTotal
			label={`Request an Insight`}
			chart={
				<div className="px-8">
					<form
						className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-4"
						onSubmit={(e) => {
							e.preventDefault();
							// @ts-ignore
							const [feedbackElement] = e.target;
							const feedback = (feedbackElement as HTMLTextAreaElement).value;
							trackEvent('Feedback', {
								email: data?.user?.email,
								feedback,
								area: 'Dashboard - Insights',
							});
							toast.success('Feedback submitted thanks!');
						}}
					>
						<Textarea
							className="h-32"
							placeholder={
								'What insights would you like to see? Any feedback on the current insights?'
							}
							minLength={1}
							required
							inputMode={'text'}
						/>
						<Button>Submit</Button>
					</form>
				</div>
			}
		/>
	);
}
