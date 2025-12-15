"use client";

import { ChevronDown, Plus } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../dropdown-menu";
import { Link } from "../link";
import { ServerIcon } from "../server-icon";
import { Skeleton } from "../skeleton";

export interface ServerSelectServer {
	id: string;
	name: string;
	icon?: string | null;
	hasBot?: boolean;
	discordId?: bigint; // Discord ID for fetching icons
}

const ServerSelectRow = (props: {
	server: Pick<ServerSelectServer, "id" | "name" | "icon" | "discordId">;
	selected?: boolean;
}) => (
	<div className="flex items-center gap-3 min-w-0">
		<ServerIcon
			server={{
				discordId: props.server.discordId ?? BigInt(props.server.id),
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
	currentServerId?: string;
	servers?: ServerSelectServer[];
	getServerHref?: (serverId: string) => string;
	addNewHref?: string;
	addNewLabel?: string;
	emptyMessage?: string;
	isLoading?: boolean;
}

export function ServerSelectDropdown({
	currentServerId,
	servers = [],
	getServerHref = (serverId) => `/dashboard/${serverId}`,
	addNewHref = "/dashboard",
	addNewLabel = "Add new",
	emptyMessage = "No servers with bot found",
	isLoading = false,
}: ServerSelectDropdownProps) {
	const [open, setOpen] = React.useState(false);
	const serversWithDashboard = servers.filter((server) => server.hasBot);
	const selectedServer =
		serversWithDashboard.find((x) => x.id === currentServerId) ??
		serversWithDashboard[0];

	if (isLoading) {
		return <Skeleton className="h-10 w-48" />;
	}

	return (
		<DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				{selectedServer ? (
					<Button
						variant="ghost"
						className="h-auto gap-3 px-3 py-2 hover:bg-accent"
					>
						<ServerIcon
							server={{
								discordId:
									selectedServer.discordId ?? BigInt(selectedServer.id),
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
					<DropdownMenuItem
						key={server.id}
						onSelect={() => {
							setOpen(false);
						}}
						asChild
					>
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
				<DropdownMenuItem
					onSelect={() => {
						setOpen(false);
					}}
					asChild
				>
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
