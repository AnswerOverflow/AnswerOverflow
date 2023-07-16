import { Card, Flex, LineChart, Metric, Title, Text } from '@tremor/react';
import type { Plan } from '@answeroverflow/db';
import { trpc } from '~ui/utils/trpc';
import { AOLink } from '../primitives';
import { useDashboardContext } from './dashboard-context';

export function PageViewsCardRenderer(props: {
	numberOfPageViews?: number;
	status: 'success' | 'loading' | 'error';
}) {
	const limit = 100000;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const progress = (props.numberOfPageViews ?? 0) / limit;
	return (
		<Card className="mx-auto">
			<Flex alignItems="start">
				<div>
					<Title>Page Views</Title>
					<Metric>{props.numberOfPageViews ?? ''}</Metric>
				</div>
			</Flex>
			{/* <Flex className="mt-4">
				<Text className="truncate">{`${(progress * 100).toFixed(2)}%`}</Text>
				<Text>{limit.toLocaleString('en-US')} Limit</Text>
			</Flex>
			<ProgressBar value={progress} className="mt-2" /> */}
		</Card>
	);
}

export function PageViewsCard() {
	const { id } = useDashboardContext();
	const { data, status } = trpc.servers.fetchPageViewsAsLineChart.useQuery(id);

	return (
		<PageViewsCardRenderer
			numberOfPageViews={
				status === 'success'
					? data.reduce((acc, cur) => acc + cur['View Count'], 0)
					: undefined
			}
			status={status}
		/>
	);
}

function planToPrettyText(plan: Plan) {
	switch (plan) {
		case 'FREE':
			return 'Free';
		case 'PRO':
			return 'Pro';
		case 'OPEN_SOURCE':
			return 'Open Source';
	}
}

export function CurrentPlanCardRenderer(props: {
	plan: Plan;
	dateCancelationTakesEffect: number | null;
	dateTrialEnds: number | null;
	dateSubscriptionRenews: number | null;
	stripeCheckoutUrl: string | null;
}) {
	const {
		plan,
		dateCancelationTakesEffect,
		dateTrialEnds,
		dateSubscriptionRenews,
		stripeCheckoutUrl,
	} = props;
	const dateInMs =
		dateCancelationTakesEffect ??
		dateTrialEnds ??
		dateSubscriptionRenews ??
		null;

	const label = dateCancelationTakesEffect
		? 'Cancelation Takes Effect'
		: dateTrialEnds
		? 'Trial Ends'
		: dateSubscriptionRenews
		? 'Renews'
		: '';
	return (
		<Card className="mx-auto">
			<Flex alignItems="start">
				<div>
					<Title>Current Plan</Title>
					<Metric>{planToPrettyText(plan)}</Metric>
				</div>
			</Flex>
			<Flex className="mt-4">
				<Text>{`${label} ${
					dateInMs ? new Date(dateInMs * 1000).toLocaleDateString() : ''
				}`}</Text>
				{stripeCheckoutUrl && (
					<AOLink href={stripeCheckoutUrl}>
						<Text>Change Plan</Text>
					</AOLink>
				)}
			</Flex>
		</Card>
	);
}

export function CurrentPlanCard() {
	const {
		dateCancelationTakesEffect,
		dateTrialEnds,
		dateSubscriptionRenews,
		plan,
		stripeCheckoutUrl,
	} = useDashboardContext();
	return (
		<CurrentPlanCardRenderer
			plan={plan}
			dateCancelationTakesEffect={dateCancelationTakesEffect}
			dateTrialEnds={dateTrialEnds}
			dateSubscriptionRenews={dateSubscriptionRenews}
			stripeCheckoutUrl={stripeCheckoutUrl}
		/>
	);
}

export function PageViewChartRenderer(props: {
	data: {
		day: string;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		'View Count': number;
	}[];
	status: 'error' | 'loading' | 'success';
}) {
	return (
		<Card>
			<Title>Page Views This Month</Title>
			<LineChart
				data={props.data}
				index="day"
				categories={['View Count']}
				yAxisWidth={40}
				noDataText="No Data"
			/>
		</Card>
	);
}

export const PageViewChart = () => {
	const { id } = useDashboardContext();
	const { data, status } = trpc.servers.fetchPageViewsAsLineChart.useQuery(id);
	return (
		<PageViewChartRenderer
			data={status === 'success' ? data : []}
			status={status}
		/>
	);
};
