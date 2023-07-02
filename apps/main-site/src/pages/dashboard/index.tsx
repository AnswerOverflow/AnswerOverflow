import { ServerPublic } from '@answeroverflow/api';
import {
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

import {
	LineChart,
	Grid,
	Title,
	Tab,
	TabList,
	TabGroup,
	TabPanel,
	TabPanels,
} from '@tremor/react';
import {
	BadgeDelta,
	Card,
	Flex,
	Metric,
	ProgressBar,
	Text,
} from '@tremor/react';

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

const chartdata = [
	{
		year: 1970,
		'Export Growth Rate': 2.04,
		'Import Growth Rate': 1.53,
	},
	{
		year: 1971,
		'Export Growth Rate': 1.96,
		'Import Growth Rate': 1.58,
	},
	{
		year: 1972,
		'Export Growth Rate': 1.96,
		'Import Growth Rate': 1.61,
	},
	{
		year: 1973,
		'Export Growth Rate': 1.93,
		'Import Growth Rate': 1.61,
	},
	{
		year: 1974,
		'Export Growth Rate': 1.88,
		'Import Growth Rate': 1.67,
	},
];

const dataFormatter = (number: number) =>
	`${Intl.NumberFormat('us').format(number).toString()}%`;

const LineChartTest = () => (
	<Card>
		<Title>Export/Import Growth Rates (1970 to 2021)</Title>
		<LineChart
			className="mt-6"
			data={chartdata}
			index="year"
			categories={['Export Growth Rate', 'Import Growth Rate']}
			colors={['emerald', 'gray']}
			valueFormatter={dataFormatter}
			yAxisWidth={40}
		/>
	</Card>
);

function KpiCard() {
	return (
		<Card className="mx-auto max-w-lg">
			<Flex alignItems="start">
				<div>
					<Text>Sales</Text>
					<Metric>$ 12,699</Metric>
				</div>
				<BadgeDelta deltaType="moderateIncrease">13.2%</BadgeDelta>
			</Flex>
			<Flex className="mt-4">
				<Text className="truncate">68% ($ 149,940)</Text>
				<Text>$ 220,500</Text>
			</Flex>
			<ProgressBar value={15.9} className="mt-2" />
		</Card>
	);
}

export default function Dashboard() {
	const user = useSession();
	return (
		<>
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
			<TabGroup className="mt-6">
				<TabList>
					<Tab>Overview</Tab>
					<Tab>Detail</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>
						<Grid numItemsMd={2} numItemsLg={3} className="mt-6 gap-6">
							<Card>
								<KpiCard />
							</Card>
							<Card>
								{/* Placeholder to set height */}
								<div className="h-28" />
							</Card>
							<Card>
								{/* Placeholder to set height */}
								<div className="h-28" />
							</Card>
						</Grid>
						<div className="mt-6">
							<Card>
								<div className="h-80" />
							</Card>
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
