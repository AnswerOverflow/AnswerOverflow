import Link from 'next/link';
import type { ServerPublic } from '@answeroverflow/api';
import { trpc } from '~ui/utils/client';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { Button } from '~ui/components/primitives/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~ui/components/primitives/ui/dropdown-menu';
import { ServerIcon } from '~ui/components/primitives/ServerIcon';
import { AnswerOverflowLogo } from '~ui/components/primitives/base/AnswerOverflowLogo';

import React from 'react';
import { useParams } from 'next/navigation';

export function DashboardServerSelect() {
	const params = useParams<{ serverId: string }>();
	const serverId = params?.serverId as string | undefined;
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

function DashboardNavbarRenderer() {
	return (
		<nav className="mx-auto flex max-w-screen-2xl items-center justify-between p-2 md:p-8">
			<div className="flex flex-row items-center justify-between space-x-4">
				<Link href="/" className="hidden md:block">
					<div className={'w-40 md:w-52'}>
						<AnswerOverflowLogo width={'full'} />
					</div>
				</Link>
				<div className="hidden h-6 rotate-[30deg] border-l border-stone-400 md:block" />
				<DashboardServerSelect />
			</div>
		</nav>
	);
}

export function DashboardNavbar() {
	return <DashboardNavbarRenderer />;
}
