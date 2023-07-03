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
} from '@tremor/react';
import Link from 'next/link';
import {
	AOHead,
	AnswerOverflowLogo,
	ThemeSwitcher,
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

function KpiCard() {
	return (
		<Card className="mx-auto max-w-lg">
			<Flex alignItems="start">
				<div>
					<Text>Page Views</Text>
					<Metric>20,000</Metric>
				</div>
			</Flex>
			<Flex className="mt-4">
				<Text className="truncate">20%</Text>
				<Text>100,000 Limit</Text>
			</Flex>
			<ProgressBar value={20} className="mt-2" />
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
}) {
	return (
		<Card className="mx-auto max-w-lg">
			<Flex alignItems="start">
				<div>
					<Text>Current Plan</Text>
					<Metric>{planToPrettyText(props)}</Metric>
				</div>
			</Flex>
			<Flex className="mt-4">
				<Text>Renews on 12/3/20</Text>
				{props.stripeUrl && (
					<AOLink href={props.stripeUrl}>
						<Text>Change Plan</Text>
					</AOLink>
				)}
			</Flex>
		</Card>
	);
}

export function ServerDashboard(props: { serverId: string }) {
	const user = useSession();
	const { data } = trpc.servers.fetchDashboardById.useQuery(props.serverId);

	return (
		<>
			<AOHead title="Dashboard" path={'/dashboard'} />
			<nav className="flex w-full items-center justify-between p-8">
				<div className="flex flex-row items-center justify-between space-x-4">
					<Link href="/" className="hidden md:block">
						<AnswerOverflowLogo className="w-52" />
					</Link>
					<div className="hidden h-6 rotate-[30deg] border-l border-stone-400 md:block" />
					<DashboardServerSelect />
				</div>
				<div className="flex flex-row items-center space-x-4">
					<div className="hidden md:block">
						<ThemeSwitcher />
					</div>
					{user.data && <UserAvatar user={user.data.user} />}
				</div>
			</nav>
			{data ? (
				<TabGroup className="px-8">
					<TabList>
						<Tab>Overview</Tab>
						<Tab>Settings</Tab>
					</TabList>
					<TabPanels>
						<TabPanel>
							<Grid numItemsMd={2} numItemsLg={3} className="mt-6 gap-6">
								<KpiCard />
								<CurrentPlanCard
									server={data}
									stripeUrl={data.stripeCheckoutUrl}
								/>
							</Grid>
							<div className="mt-6">
								<ConfigureDomainCard server={data} />
							</div>
						</TabPanel>
						<TabPanel>
							<div className="mt-6">
								<Card>
									<div className="h-96" />
								</Card>
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
