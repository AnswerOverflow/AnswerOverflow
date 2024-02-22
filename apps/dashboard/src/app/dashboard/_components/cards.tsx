import {
	Card,
	Flex,
	LineChart,
	Metric,
	Title,
	Text,
	ProgressBar,
} from '@tremor/react';
import type { Plan } from '@answeroverflow/db';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import { useDashboardContext } from './dashboard-context';
import { PricingDialog } from '@answeroverflow/ui/src/components/primitives/pricing';
import { BlueLink } from '@answeroverflow/ui/src/components/primitives/ui/blue-link';
import { Input } from '@answeroverflow/ui/src/components/primitives/ui/input';
import { CopyButton } from '@answeroverflow/ui/src/components/primitives/ui/copy-button';
import { Button } from '@answeroverflow/ui/src/components/primitives/ui/button';
import { LuRefreshCw } from 'react-icons/lu';
import { toast } from 'react-toastify';

export function PageViewsCardRenderer(props: {
	numberOfPageViews?: number;
	status: 'success' | 'loading' | 'error';
	plan: Plan;
}) {
	let limit: number | undefined = undefined;
	switch (props.plan) {
		case 'FREE':
			limit = undefined;
			break;
		case 'PRO':
			limit = 100000;
			break;
		case 'OPEN_SOURCE':
			limit = undefined;
			break;
		case 'ENTERPRISE':
			limit = 500000;
			break;
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const AmountUsed = () => {
		if (!limit) return null;
		const progress = (props.numberOfPageViews ?? 0) / limit;
		return (
			<>
				<Flex className="mt-4">
					<Text className="truncate">{`${(progress * 100).toFixed(2)}%`}</Text>
					<Text>{limit.toLocaleString('en-US')} Limit</Text>
				</Flex>
				<ProgressBar value={progress * 100} className="mt-2" />
			</>
		);
	};
	return (
		<Card className="mx-auto">
			<Flex alignItems="start">
				<div>
					<Title>Page Views</Title>
					<Metric>{props.numberOfPageViews?.toLocaleString() ?? ''}</Metric>
				</div>
			</Flex>
			<AmountUsed />
		</Card>
	);
}

export function PageViewsCard() {
	const { id, plan } = useDashboardContext();
	const { data, status } = trpc.servers.fetchPageViewsAsLineChart.useQuery(id);

	return (
		<PageViewsCardRenderer
			plan={plan}
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
		case 'ENTERPRISE':
			return 'Enterprise';
	}
}

export function CurrentPlanCardRenderer(
	props: {
		plan: Plan;
		dateCancelationTakesEffect: number | null;
		dateTrialEnds: number | null;
		dateSubscriptionRenews: number | null;
	} & (
		| {
				status: 'active';
				stripeCheckoutUrl: string | null;
		  }
		| {
				status: 'inactive';
				proPlanCheckoutUrl: string | null;
				enterprisePlanCheckoutUrl: string | null;
				hasSubscribedBefore: boolean;
		  }
	),
) {
	const {
		plan,
		dateCancelationTakesEffect,
		dateTrialEnds,
		dateSubscriptionRenews,
		status,
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

	const CTA = () => {
		if (status === 'inactive') {
			if (
				!props.proPlanCheckoutUrl ||
				!props.enterprisePlanCheckoutUrl ||
				props.plan === 'OPEN_SOURCE'
			) {
				return;
			}
			return (
				<PricingDialog
					proPlanCheckoutUrl={props.proPlanCheckoutUrl}
					enterprisePlanCheckoutUrl={props.enterprisePlanCheckoutUrl}
					hasSubscribedBefore={props.hasSubscribedBefore}
				/>
			);
		} else {
			if (!props.stripeCheckoutUrl) {
				return;
			}
			return (
				<Text>
					<BlueLink href={props.stripeCheckoutUrl}>Change Plan</BlueLink>
				</Text>
			);
		}
	};

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

				<CTA />
			</Flex>
		</Card>
	);
}

export function CurrentPlanCard() {
	const server = useDashboardContext();
	return <CurrentPlanCardRenderer {...server} />;
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

export const ApiKeyCard = () => {
	const { id } = useDashboardContext();
	const uss = trpc.userServerSettings.byId.useQuery(id);

	const mutation = trpc.userServerSettings.refreshApiKey.useMutation();
	const apiKey = uss?.data?.apiKey ?? '';
	return (
		<Card>
			<Title>API Key</Title>
			<div className={'flex gap-2'}>
				<Input value={apiKey} readOnly />
				<CopyButton textToCopy={apiKey} />
				<Button
					aria-label={`Refresh API Key`}
					variant="ghost"
					size={'icon'}
					className={'transition-all duration-700 ease-in-out'}
					disabled={mutation.isLoading && !uss.isLoading}
					onClick={() => {
						mutation.mutate(id, {
							onSuccess() {
								void uss.refetch();
							},
							onError(error) {
								toast.error(error.message);
							},
						});
					}}
				>
					<LuRefreshCw
						className={`size-6  ${
							mutation.isLoading || uss.isLoading ? 'animate-spin' : ''
						}`}
					/>
				</Button>
			</div>
		</Card>
	);
};
