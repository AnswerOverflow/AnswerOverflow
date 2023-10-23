'use client';
import { useParams } from 'next/navigation';
import { trpc } from '~ui/utils/client';
import { ServerPublic } from '~api/router/server/types';
import { ServerIcon } from '~ui/components/primitives/ServerIcon';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~ui/components/primitives/ui/dropdown-menu';
import { Button } from '~ui/components/primitives/ui/button';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import Link from 'next/link';
import React from 'react';

export function DashboardServerSelect() {
	const params = useParams();
	const serverId = params.serverId as string | undefined;
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
