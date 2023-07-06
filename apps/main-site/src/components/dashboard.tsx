import {
	TabGroup,
	TabList,
	Tab,
	TabPanels,
	TabPanel,
	Grid,
	Card,
	Flex,
	Metric,
	ProgressBar,
	Text,
	Col,
} from '@tremor/react';
import Link from 'next/link';
import {
	AOHead,
	AnswerOverflowLogo,
	UserAvatar,
	GetStarted,
	AOLink,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	ServerIcon,
	trpc,
} from '@answeroverflow/ui';
import ConfigureDomainCard from './configure-domain-card';
import { useSession } from 'next-auth/react';
import { ServerPublic } from '@answeroverflow/api';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { useRouter } from 'next/router';
import type { ServerWithFlags } from '@answeroverflow/prisma-types';
import { TierAccessOnly } from './tier-access-only';
import { GoLinkExternal } from 'react-icons/go';
export function DashboardServerSelect() {
	const router = useRouter();
	const serverId = router.query.serverId as string | undefined;
	const { data } = trpc.auth.getServersForOnboarding.useQuery();
	const serversWithDashboard = data?.filter((server) => server.hasBot);
	const selectedServer =
		serversWithDashboard?.find((x) => x.id === serverId) ??
		serversWithDashboard?.[0];
	const ServerCard = (props: {
		server: Pick<ServerPublic, 'id' | 'name' | 'icon'>;
	}) => (
		<div
			className="flex items-center space-x-2 text-left"
			style={{
				maxWidth: '200px',
			}}
		>
			<ServerIcon server={props.server} size={'sm'} />
			<span>{props.server.name}</span>
		</div>
	);
	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					{selectedServer ? (
						<Button
							className="flex items-center space-x-2 px-4 py-7"
							variant={'ghost'}
						>
							<ServerCard server={selectedServer} />
							<div className=" grid grid-cols-1 grid-rows-2">
								<HiChevronUp className="h-4 w-4" />
								<HiChevronDown className="h-4 w-4" />
							</div>
						</Button>
					) : (
						<span>No servers with bot found</span>
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{serversWithDashboard?.map((server) => (
						<DropdownMenuItem key={server.id}>
							<Link href={`/dashboard/${server.id}`}>
								<ServerCard server={server} />
							</Link>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function PageViewsCard(props: { serverId: string }) {
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

function CurrentPlanCard(props: {
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

import { LineChart, Title } from '@tremor/react';

const LineChartCard = (props: { serverId: string }) => {
	const { data } = trpc.servers.fetchPageViewsAsLineChart.useQuery(
		props.serverId,
	);
	return (
		<Card>
			<Title>Page Views This Month</Title>
			{data && (
				<LineChart
					data={data}
					index="label"
					categories={['value']}
					yAxisWidth={40}
				/>
			)}
		</Card>
	);
};

export function ServerDashboard(props: { serverId: string }) {
	const user = useSession();
	const { data } = trpc.servers.fetchDashboardById.useQuery(props.serverId);

	return (
		<>
			<AOHead title="Dashboard" path={'/dashboard'} />
			<nav className="mx-auto flex max-w-screen-2xl items-center justify-between p-2 md:p-8">
				<div className="flex flex-row items-center justify-between space-x-4">
					<Link href="/" className="hidden md:block">
						<AnswerOverflowLogo className="w-52" />
					</Link>
					<div className="hidden h-6 rotate-[30deg] border-l border-stone-400 md:block" />
					<DashboardServerSelect />
				</div>
				<div className="flex flex-row items-center space-x-4">
					{user.data && <UserAvatar user={user.data.user} />}
				</div>
			</nav>
			{data ? (
				<TabGroup className="px-2 md:px-8">
					<TabList className="mx-auto max-w-7xl">
						<Tab>Overview</Tab>
					</TabList>
					<TabPanels className="mx-auto max-w-7xl">
						<TabPanel>
							<Grid numItemsLg={6} className="mt-6 gap-6">
								{/* Main section */}
								<Col numColSpanLg={4}>
									<LineChartCard serverId={data.id} />
								</Col>

								{/* KPI sidebar */}
								<Col
									numColSpanLg={2}
									className="flex flex-col justify-between gap-4"
								>
									<Card>
										<AOLink
											href={
												data.customDomain
													? `https://${data.customDomain}`
													: `/c/${data.id}`
											}
											className="flex items-center gap-2"
										>
											<Title>View Community</Title>
											<GoLinkExternal className="mt-1 h-5 w-5" />
										</AOLink>
									</Card>
									<PageViewsCard serverId={data.id} />

									<CurrentPlanCard
										server={data}
										stripeUrl={data.stripeCheckoutUrl}
										dateCancelationTakesEffect={data.cancelAt}
										dateSubscriptionRenews={data.currentPeriodEnd}
										dateTrialEnds={data.trialEnd}
									/>
								</Col>
							</Grid>

							<div className="mt-6">
								<TierAccessOnly
									enabledFor={['PRO', 'OPEN_SOURCE']}
									currentPlan={data.plan}
								>
									<ConfigureDomainCard server={data} />
								</TierAccessOnly>
							</div>
						</TabPanel>
					</TabPanels>
				</TabGroup>
			) : (
				<div className="flex h-screen flex-col items-center justify-center">
					<div className="text-4xl font-bold">No servers with bot found</div>
					<div className="text-2xl">Add the bot to a server to get started</div>
					<GetStarted className="mt-6" location="Pricing" />
				</div>
			)}
		</>
	);
}
