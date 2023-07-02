import { ServerPublic } from '@answeroverflow/api';
import {
	AOHead,
	AnswerOverflowLogo,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	ServerIcon,
	ThemeSwitcher,
	UserAvatar,
} from '~ui/components/primitives';
import { trpc } from '~ui/utils/trpc';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { HiChevronUp, HiChevronDown } from 'react-icons/hi';
import { AOLink } from '@answeroverflow/ui';
import {
	LineChart,
	Grid,
	Title,
	Tab,
	TabList,
	TabGroup,
	TabPanel,
	TabPanels,
	AreaChart,
	Color,
} from '@tremor/react';
import {
	BadgeDelta,
	Card,
	Flex,
	Metric,
	ProgressBar,
	Text,
} from '@tremor/react';
import { useState } from 'react';
import Form from '../../components/Form';

export function DashboardServerSelect() {
	const { data } = trpc.auth.getServersForOnboarding.useQuery();
	const serversWithDashboard = data?.filter((server) => server.hasBot);
	const selectedServer = serversWithDashboard?.[0];
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
				<DropdownMenuTrigger>
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

function CurrentPlanCard() {
	return (
		<Card className="mx-auto max-w-lg">
			<Flex alignItems="start">
				<div>
					<Text>Current Plan</Text>
					<Metric>Pro</Metric>
				</div>
			</Flex>
			<Flex className="mt-4">
				<Text>Renews on 12/3/20</Text>
				<AOLink href="www.stripe.com">
					<Text>Change Plan</Text>
				</AOLink>
			</Flex>
		</Card>
	);
}

export default function Dashboard() {
	const user = useSession();
	return (
		<>
			<AOHead title="Dashboard" path={'/dashboard'} />
			<nav className="flex w-full items-center justify-between p-8">
				<div className="flex flex-row items-center justify-between space-x-4">
					<Link href="/">
						<AnswerOverflowLogo className="w-52" />
					</Link>
					<div className="h-6 rotate-[30deg] border-l border-stone-400" />
					<DashboardServerSelect />
				</div>
				<div className="flex flex-row items-center space-x-4">
					<ThemeSwitcher />
					{user.data && <UserAvatar user={user.data.user} />}
				</div>
			</nav>
			<TabGroup className="px-8">
				<TabList>
					<Tab>Overview</Tab>
					<Tab>Settings</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>
						<Grid numItemsMd={2} numItemsLg={3} className="mt-6 gap-6">
							<KpiCard />
							<CurrentPlanCard />
						</Grid>
						<div className="mt-6">
							<Form
								title="Custom Domain"
								description="The custom domain for your site."
								helpText="Please enter a valid domain."
								inputAttrs={{
									name: 'customDomain',
									type: 'text',
									defaultValue: '',
									placeholder: 'yourdomain.com',
									maxLength: 64,
									pattern: '^[a-z0-9]+([\\-\\.]{1}[a-z0-9]+)*\\.[a-z]{2,5}$',
								}}
								handleSubmit={() => {}}
							/>
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
		</>
	);
}
