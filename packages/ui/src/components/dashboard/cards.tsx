import {
	Card,
	Flex,
	LineChart,
	Metric,
	ProgressBar,
	Title,
	Text
} from '@tremor/react';
import type { ServerWithFlags } from '@answeroverflow/db';
import { trpc } from '~ui/utils/trpc';
import { AOLink } from '../primitives';

export function PageViewsCard(props: { serverId: string }) {
	const { data } = trpc.servers.fetchPageViewCount.useQuery(props.serverId);
	const limit = 100000;
	const progress = (data ?? 0) / limit;
	return (
		<Card className="mx-auto">
			<Flex alignItems="start">
				<div>
					<Title>Page Views</Title>
					<Metric>{data ?? ''}</Metric>
				</div>
			</Flex>
			<Flex className="mt-4">
				<Text className="truncate">{`${(progress * 100).toFixed(2)}%`}</Text>
				<Text>{limit.toLocaleString('en-US')} Limit</Text>
			</Flex>
			<ProgressBar value={progress} className="mt-2" />
		</Card>
	);
}

function planToPrettyText(props: { server: Pick<ServerWithFlags, 'plan'> }) {
	switch (props.server.plan) {
		case 'FREE':
			return 'Free';
		case 'PRO':
			return 'Pro';
		case 'OPEN_SOURCE':
			return 'Open Source';
	}
}

export function CurrentPlanCard(props: {
	server: Pick<ServerWithFlags, 'id' | 'plan'>;
	stripeUrl: string | null;
	dateCancelationTakesEffect: number | null;
	dateSubscriptionRenews: number | null;
	dateTrialEnds: number | null;
}) {
	const dateInMs =
		props.dateCancelationTakesEffect ??
		props.dateTrialEnds ??
		props.dateSubscriptionRenews ??
		null;

	const label = props.dateCancelationTakesEffect
		? 'Cancelation Takes Effect'
		: props.dateTrialEnds
		? 'Trial Ends'
		: props.dateSubscriptionRenews
		? 'Renews'
		: '';
	return (
		<Card className="mx-auto">
			<Flex alignItems="start">
				<div>
					<Title>Current Plan</Title>
					<Metric>{planToPrettyText(props)}</Metric>
				</div>
			</Flex>
			<Flex className="mt-4">
				<Text>
					{`${label} ${
						dateInMs ? new Date(dateInMs * 1000).toLocaleDateString() : ''
					}`}
				</Text>
				{props.stripeUrl && (
					<AOLink href={props.stripeUrl}>
						<Text>Change Plan</Text>
					</AOLink>
				)}
			</Flex>
		</Card>
	);
}

export const LineChartCard = (props: { serverId: string }) => {
	const { data } = trpc.servers.fetchPageViewsAsLineChart.useQuery(
		props.serverId,
	);
	return (
		<Card>
			<Title>Page Views This Month</Title>
			{data && (
				<LineChart
					data={data}
					index="day"
					categories={['View Count']}
					yAxisWidth={40}
				/>
			)}
		</Card>
	);
};
