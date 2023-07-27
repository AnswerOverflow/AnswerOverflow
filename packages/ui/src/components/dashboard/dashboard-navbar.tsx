import Link from 'next/link';
import { AnswerOverflowLogo, ServerIcon, UserAvatar } from '../primitives';
import { useRouter } from 'next/router';
import type { ServerPublic } from '@answeroverflow/api';
import { trpc } from '~ui/utils/trpc';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import type { Session } from 'next-auth';
import { useSession } from 'next-auth/react';
import { Button } from '~ui/components/primitives/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~ui/components/primitives/ui/dropdown-menu';

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
			<ServerIcon server={props.server} size={40} />
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
						<DropdownMenuItem key={server.id} asChild>
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

function DashboardNavbarRenderer(props: { user: Session['user'] | undefined }) {
	return (
		<nav className="mx-auto flex max-w-screen-2xl items-center justify-between p-2 md:p-8">
			<div className="flex flex-row items-center justify-between space-x-4">
				<Link href="/" className="hidden md:block">
					<AnswerOverflowLogo className="w-52" />
				</Link>
				<div className="hidden h-6 rotate-[30deg] border-l border-stone-400 md:block" />
				<DashboardServerSelect />
			</div>
			<div className="flex flex-row items-center space-x-4">
				{props.user && <UserAvatar user={props.user} />}
			</div>
		</nav>
	);
}

export function DashboardNavbar() {
	const user = useSession();
	return <DashboardNavbarRenderer user={user?.data?.user} />;
}
