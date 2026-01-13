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
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@packages/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, Loader2, MessageCircle, Users } from "lucide-react";
import { useState } from "react";
import { useDebounce } from "use-debounce";
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

type SearchResponse = {
	servers: DiscordServerContext[];
};

export function DiscordServerSelector({
	selectedServer,
	onSelectServer,
	compact = false,
}: DiscordServerSelectorProps) {
	const initialFeaturedServers = useFeaturedServers();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 300);

	const serversQuery = useQuery({
		queryKey: ["discord-servers-search", debouncedSearch],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (debouncedSearch.trim()) {
				params.set("q", debouncedSearch.trim());
			}
			params.set("limit", "30");
			const response = await fetch(
				`/api/discord-servers/search?${params.toString()}`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch servers");
			}
			const data = (await response.json()) as SearchResponse;
			return data.servers;
		},
		initialData:
			initialFeaturedServers.length > 0 ? initialFeaturedServers : undefined,
		enabled:
			open && (!!debouncedSearch.trim() || initialFeaturedServers.length === 0),
		staleTime: 1000 * 60 * 2,
		placeholderData: (prev) => prev,
	});

	const handleSelect = (server: DiscordServerContext) => {
		onSelectServer(server);
		setOpen(false);
		setSearch("");
	};

	const handleClear = () => {
		onSelectServer(null);
		setOpen(false);
		setSearch("");
	};

	const isSelected = (server: DiscordServerContext) =>
		selectedServer?.discordId === server.discordId;

	const isDebouncing = search !== debouncedSearch;
	const hasSearchData = serversQuery.data && serversQuery.data.length > 0;
	const isInitialLoading =
		(isDebouncing && !hasSearchData) ||
		(serversQuery.isLoading && !hasSearchData);
	const isRefetching = serversQuery.isFetching && hasSearchData;

	const displayServers = serversQuery.data ?? [];

	const getHeading = () => {
		if (search.trim()) {
			return "Search results";
		}
		return "Popular servers";
	};

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<PromptInputButton size={compact ? "icon-sm" : "sm"}>
					{selectedServer?.iconUrl ? (
						<Avatar className="size-5">
							<AvatarImage
								src={selectedServer.iconUrl}
								alt={selectedServer.name}
							/>
							<AvatarFallback className="text-[10px]">
								{getInitials(selectedServer.name)}
							</AvatarFallback>
						</Avatar>
					) : (
						<MessageCircle className="size-4" />
					)}
					{!compact && (
						<span className="truncate max-w-[150px]">
							{selectedServer ? selectedServer.name : "Select server"}
						</span>
					)}
				</PromptInputButton>
			</PopoverTrigger>
			<PopoverContent
				className="w-[min(400px,calc(100vw-2rem))] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<div className="relative">
						<CommandInput
							placeholder="Search Discord servers..."
							value={search}
							onValueChange={setSearch}
						/>
						{isRefetching && (
							<div className="absolute right-3 top-1/2 -translate-y-1/2">
								<Loader2 className="size-3 animate-spin text-muted-foreground" />
							</div>
						)}
					</div>
					<CommandList>
						<CommandGroup heading="Selection">
							<CommandItem
								value="Any server"
								onSelect={handleClear}
								className="flex items-center gap-3"
							>
								<MessageCircle className="size-4" />
								<span className="flex-1">Any server</span>
								{selectedServer === null && <CheckIcon className="size-4" />}
							</CommandItem>
						</CommandGroup>
						{isInitialLoading ? (
							<div className="flex flex-col gap-2 p-2">
								<Skeleton className="h-14 w-full" />
								<Skeleton className="h-14 w-full" />
								<Skeleton className="h-14 w-full" />
							</div>
						) : displayServers.length === 0 ? (
							<CommandEmpty>No servers found.</CommandEmpty>
						) : (
							<CommandGroup heading={getHeading()}>
								{displayServers.map((server) => (
									<CommandItem
										key={server.discordId}
										value={server.name}
										onSelect={() => handleSelect(server)}
										className="flex items-start gap-3 py-2"
									>
										<Avatar className="size-5 mt-0.5 shrink-0">
											<AvatarImage src={server.iconUrl} alt={server.name} />
											<AvatarFallback className="text-[10px]">
												{getInitials(server.name)}
											</AvatarFallback>
										</Avatar>
										<div className="flex flex-col flex-1 min-w-0">
											<span className="font-medium truncate">
												{server.name}
											</span>
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
										{isSelected(server) && (
											<CheckIcon className="size-4 shrink-0" />
										)}
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
