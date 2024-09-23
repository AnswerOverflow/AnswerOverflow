'use client';
import Link from '@answeroverflow/ui/src/ui/link';
import type { ServerPublic } from '@answeroverflow/api';
import { trpc } from '@answeroverflow/ui/src/utils/client';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { Button } from '@answeroverflow/ui/src/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@answeroverflow/ui/src/ui/dropdown-menu';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import React from 'react';
import { useParams } from 'next/navigation';
import { LiaPlusCircleSolid } from 'react-icons/lia';
import { demoServerData } from './mock';

const ServerSelectRow = (props: {
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

export function ServerSelectDropdown() {
	const params = useParams();
	const serverId = params?.serverId as string | undefined;
	const { data } = trpc.auth.getServersForOnboarding.useQuery();
	const serversWithDashboard = data?.filter((server) => server.hasBot);
	const selectedServer =
		serverId === '1000'
			? demoServerData
			: (serversWithDashboard?.find((x) => x.id === serverId) ??
				serversWithDashboard?.[0]);

	return (
		<div>
			<DropdownMenu modal={false}>
				<DropdownMenuTrigger asChild>
					{selectedServer ? (
						<Button
							className="flex items-center space-x-2 rounded-none px-4 py-7"
							variant={'ghost'}
						>
							<ServerSelectRow server={selectedServer} />
							<div className="grid grid-cols-1 grid-rows-2">
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
								<ServerSelectRow server={server} />
							</Link>
						</DropdownMenuItem>
					))}
					<DropdownMenuItem>
						<Link
							href={'/onboarding'}
							className={'flex w-full items-center gap-2 text-left'}
						>
							<LiaPlusCircleSolid className={'h-[40px] w-[40px]'} />
							Add new
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
