"use client";

import type * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "../button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../dropdown-menu";
import { ServerIcon } from "../server-icon";
import { Skeleton } from "../skeleton";
import { cn } from "../../lib/utils";

export interface ServerSelectServer {
	id: string;
	name: string;
	icon?: string | null;
	hasBot?: boolean;
	discordId?: string; // Discord ID for fetching icons
}

const ServerSelectRow = (props: {
	server: Pick<ServerSelectServer, "id" | "name" | "icon" | "discordId">;
	selected?: boolean;
}) => (
	<div className="flex items-center gap-3 min-w-0">
		<ServerIcon
			server={{
				discordId: props.server.discordId ?? props.server.id,
				name: props.server.name,
				icon: props.server.icon ?? undefined,
			}}
			size={32}
			className="shrink-0"
		/>
		<span
			className={cn("truncate font-medium", props.selected && "font-semibold")}
		>
			{props.server.name}
		</span>
	</div>
);

export interface ServerSelectDropdownProps {
	/** Current selected server ID */
	currentServerId?: string;
	/** List of servers to display */
	servers?: ServerSelectServer[];
	/** Function to generate href for server navigation */
	getServerHref?: (serverId: string) => string;
	/** Href for "Add new" button */
	addNewHref?: string;
	/** Label for "Add new" button */
	addNewLabel?: string;
	/** Custom empty state message */
	emptyMessage?: string;
	/** Whether the servers are currently loading */
	isLoading?: boolean;
}

export function ServerSelectDropdown({
	currentServerId,
	servers = [],
	getServerHref = (serverId) => `/dashboard/${serverId}`,
	addNewHref = "/onboarding",
	addNewLabel = "Add new",
	emptyMessage = "No servers with bot found",
	isLoading = false,
}: ServerSelectDropdownProps) {
	const serversWithDashboard = servers.filter((server) => server.hasBot);
	const selectedServer =
		serversWithDashboard.find((x) => x.id === currentServerId) ??
		serversWithDashboard[0];

	if (isLoading) {
		return <Skeleton className="h-10 w-48" />;
	}

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				{selectedServer ? (
					<Button
						variant="ghost"
						className="h-auto gap-3 px-3 py-2 hover:bg-accent"
					>
						<ServerIcon
							server={{
								discordId: selectedServer.discordId ?? selectedServer.id,
								name: selectedServer.name,
								icon: selectedServer.icon ?? undefined,
							}}
							size={32}
							className="shrink-0"
						/>
						<span className="truncate font-semibold max-w-[200px]">
							{selectedServer.name}
						</span>
						<ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
					</Button>
				) : (
					<Button variant="ghost" disabled>
						<span className="text-muted-foreground">{emptyMessage}</span>
					</Button>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-[240px]">
				{serversWithDashboard.map((server) => (
					<DropdownMenuItem key={server.id} asChild>
						<Link
							href={getServerHref(server.id)}
							className="flex w-full items-center no-underline"
						>
							<ServerSelectRow
								server={server}
								selected={server.id === currentServerId}
							/>
						</Link>
					</DropdownMenuItem>
				))}
				{serversWithDashboard.length > 0 && <DropdownMenuSeparator />}
				<DropdownMenuItem asChild>
					<Link
						href={addNewHref}
						className="flex w-full items-center gap-3 no-underline"
					>
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-dashed">
							<Plus className="h-4 w-4" />
						</div>
						<span>{addNewLabel}</span>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
