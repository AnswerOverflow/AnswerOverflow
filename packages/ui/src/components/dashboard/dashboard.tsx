/* eslint-disable @typescript-eslint/naming-convention */
import {
	TabGroup,
	TabList,
	Tab,
	TabPanels,
	TabPanel,
	Grid,
	Card,
	Col,
	Title,
} from '@tremor/react';
import { AOHead, GetStarted, AOLink, Footer } from '../primitives';
import { trpc } from '~ui/utils/trpc';
import { ConfigureDomainCard } from './domains';
import { GoLinkExternal } from 'react-icons/go';
import { DashboardNavbar } from './dashboard-navbar';
import { CurrentPlanCard, PageViewChart, PageViewsCard } from './cards';
import { TierAccessOnly } from '../primitives/tier-access-only';
import type { ServerDashboard } from '@answeroverflow/api';
import { DashboardProvider } from './dashboard-context';
import { getServerHomepageUrl } from '~ui/utils/server';

export function ServerDashboardRenderer(props: {
	data: ServerDashboard;
	PageViewChartOverride?: React.ReactNode;
	PageViewsCardOverride?: React.ReactNode;
	CurrentPlanCardOverride?: React.ReactNode;
	ConfigureDomainCardOverride?: React.ReactNode;
}) {
	const {
		data,
		PageViewChartOverride,
		PageViewsCardOverride,
		CurrentPlanCardOverride,
		ConfigureDomainCardOverride,
	} = props;
	return (
		<DashboardProvider value={data}>
			<TabGroup className="px-2 md:px-8">
				<TabList className="mx-auto max-w-7xl">
					<Tab>Overview</Tab>
				</TabList>
				<TabPanels className="mx-auto max-w-7xl">
					<TabPanel>
						<Grid numItemsLg={6} className="mt-6 gap-6">
							{/* Main section */}
							<Col numColSpanLg={4}>
								{PageViewChartOverride ?? <PageViewChart />}
							</Col>
							{/* KPI sidebar */}
							<Col
								numColSpanLg={2}
								className="flex flex-col justify-between gap-4"
							>
								<Card>
									<AOLink
										href={getServerHomepageUrl(data)}
										className="flex items-center gap-2 no-underline hover:underline"
									>
										<Title>View Community</Title>
										<GoLinkExternal className="mt-1 h-5 w-5" />
									</AOLink>
								</Card>

								{PageViewsCardOverride ?? <PageViewsCard />}
								{CurrentPlanCardOverride ?? <CurrentPlanCard />}
							</Col>
						</Grid>

						<div className="mt-6">
							<TierAccessOnly
								enabledFor={['PRO', 'OPEN_SOURCE', 'ENTERPRISE']}
								currentPlan={data.plan}
								proPlanCheckoutUrl={
									data.status === 'inactive' ? data.proPlanCheckoutUrl : null
								}
								hasSubscribedBefore={
									data.status === 'inactive' ? data.hasSubscribedBefore : true
								}
								enterprisePlanCheckoutUrl={
									data.status === 'inactive'
										? data.enterprisePlanCheckoutUrl
										: null
								}
							>
								{ConfigureDomainCardOverride ?? <ConfigureDomainCard />}
							</TierAccessOnly>
						</div>
					</TabPanel>
				</TabPanels>
			</TabGroup>
		</DashboardProvider>
	);
}

export function ServerDashboard(props: { serverId: string }) {
	const { data, status } = trpc.servers.fetchDashboardById.useQuery(
		props.serverId,
	);
	const Body = () => {
		switch (status) {
			case 'loading':
				return (
					<div className="flex h-[50vh] items-center justify-center">
						<div className="h-32 w-32 animate-spin rounded-full border-b-4 border-blue-400" />
					</div>
				);
			case 'error':
				return (
					<div className="flex h-screen flex-col items-center justify-center">
						<div className="text-4xl font-bold">No servers with bot found</div>
						<div className="text-2xl">
							Add the bot to a server to get started
						</div>
						<GetStarted className="mt-6" location="Pricing" />
					</div>
				);
			case 'success':
				return <ServerDashboardRenderer data={data} />;
		}
	};
	return (
		<>
			<AOHead title="Dashboard" path={'/dashboard'} />
			<DashboardNavbar />
			<Body />
			<Footer />
		</>
	);
}
