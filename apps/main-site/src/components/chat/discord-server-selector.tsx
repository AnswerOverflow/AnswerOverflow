"use client";

import { PromptInputButton } from "@packages/ui/components/ai-elements/prompt-input";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
} from "@packages/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import { CheckIcon, MessageCircle, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { List, type RowComponentProps } from "react-window";
import type { DiscordServerContext } from "@/lib/discord-server-types";
import { useFeaturedServers } from "./featured-servers-provider";

type SelectedServer = {
	discordId: string;
	name: string;
	hasBot: boolean;
	iconUrl?: string;
};

type DiscordServerSelectorProps = {
	selectedServer: SelectedServer | null;
	onSelectServer: (server: DiscordServerContext | null) => void;
	compact?: boolean;
};

const getInitials = (name: string) =>
	name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2);

const formatMemberCount = (count: number) => {
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1)}M`;
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(0)}K`;
	}
	return count.toString();
};

type ServerRowProps = {
	servers: DiscordServerContext[];
	selectedServer: SelectedServer | null;
	onSelect: (server: DiscordServerContext) => void;
};

function ServerRow({
	index,
	style,
	servers,
	selectedServer,
	onSelect,
}: RowComponentProps<ServerRowProps>) {
	const server = servers[index];
	if (!server) return null;

	const isSelected = selectedServer?.discordId === server.discordId;

	return (
		<div style={style}>
			<CommandItem
				value={server.name}
				onSelect={() => onSelect(server)}
				className="flex items-start gap-3 py-2 h-full"
			>
				<Avatar className="size-5 mt-0.5 shrink-0">
					<AvatarImage src={server.iconUrl} alt={server.name} />
					<AvatarFallback className="text-[10px]">
						{getInitials(server.name)}
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-col flex-1 min-w-0">
					<span className="font-medium truncate">{server.name}</span>
					{server.description && (
						<span className="text-xs text-muted-foreground truncate">
							{server.description}
						</span>
					)}
					{server.memberCount && (
						<div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
							<Users className="size-3" />
							{formatMemberCount(server.memberCount)}
						</div>
					)}
				</div>
				{isSelected && <CheckIcon className="size-4 shrink-0" />}
			</CommandItem>
		</div>
	);
}

export function DiscordServerSelector({
	selectedServer,
	onSelectServer,
	compact = false,
}: DiscordServerSelectorProps) {
	const featuredServers = useFeaturedServers();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const displayServers = useMemo(() => {
		const servers = featuredServers ?? [];
		const query = search.trim().toLowerCase();
		if (!query) {
			return servers;
		}
		return servers.filter((server) =>
			server.name.toLowerCase().includes(query),
		);
	}, [featuredServers, search]);

	const handleSelect = (server: DiscordServerContext) => {
		if (selectedServer?.discordId === server.discordId) {
			onSelectServer(null);
		} else {
			onSelectServer(server);
		}
		setOpen(false);
		setSearch("");
	};

	const rowProps = useMemo(
		() => ({
			servers: displayServers,
			selectedServer,
			onSelect: handleSelect,
		}),
		[displayServers, selectedServer, handleSelect],
	);

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<PromptInputButton size={compact ? "icon-sm" : "sm"}>
					{selectedServer ? (
						<>
							<Avatar className="size-5">
								<AvatarImage
									src={selectedServer.iconUrl}
									alt={selectedServer.name}
								/>
								<AvatarFallback className="text-[10px]">
									{getInitials(selectedServer.name)}
								</AvatarFallback>
							</Avatar>
							{!compact && (
								<span className="truncate max-w-[150px]">
									{selectedServer.name}
								</span>
							)}
						</>
					) : (
						<>
							<MessageCircle className="size-4" />
							{!compact && <span>Select server</span>}
						</>
					)}
				</PromptInputButton>
			</PopoverTrigger>
			<PopoverContent
				className="w-[min(400px,calc(100vw-2rem))] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search Discord servers..."
						value={search}
						onValueChange={setSearch}
					/>
					{displayServers.length === 0 ? (
						<CommandEmpty>No servers found.</CommandEmpty>
					) : (
						<div className="px-1 py-1">
							<div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
								{search.trim() ? "Search results" : "Popular servers"}
							</div>
							<List
								rowComponent={ServerRow}
								rowCount={displayServers.length}
								rowHeight={64}
								rowProps={rowProps}
								overscanCount={5}
								style={{ height: 300 }}
							/>
						</div>
					)}
				</Command>
			</PopoverContent>
		</Popover>
	);
}
