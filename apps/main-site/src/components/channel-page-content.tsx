"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Button } from "@packages/ui/components/button";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@packages/ui/components/empty";
import { Link } from "@packages/ui/components/link";
import { SearchInput } from "@packages/ui/components/search-input";
import { ServerIcon } from "@packages/ui/components/server-icon";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@packages/ui/components/sheet";
import { useTenant } from "@packages/ui/components/tenant-context";
import {
	ChannelThreadCard,
	ChannelThreadCardSkeleton,
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { cn } from "@packages/ui/lib/utils";
import { encodeCursor } from "@packages/ui/utils/cursor";
import { getChannelIcon } from "@packages/ui/utils/discord";
import type { FunctionReturnType } from "convex/server";
import { FileQuestion, Menu } from "lucide-react";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { useDebounce } from "use-debounce";

export type FirstThreadAuthor = {
	id: string;
	name: string;
	avatar?: string;
} | null;

type CommunityPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getCommunityPageHeaderData>
>;

function getChannelHref({
	channelId,
	isSelected,
	serverDiscordId,
	tenantMode,
}: {
	channelId: bigint;
	isSelected: boolean;
	serverDiscordId: bigint;
	tenantMode: boolean;
}) {
	const allChannelsHref = tenantMode ? "/" : `/c/${serverDiscordId.toString()}`;
	if (isSelected) {
		return allChannelsHref;
	}
	return tenantMode
		? `/c/${channelId.toString()}`
		: `/c/${serverDiscordId.toString()}/${channelId.toString()}`;
}

function ChannelLink({
	channel,
	isSelected,
	href,
	onClick,
}: {
	channel: CommunityPageHeaderData["channels"][number];
	isSelected: boolean;
	href: string;
	onClick?: () => void;
}) {
	const Icon = getChannelIcon(channel.type);

	return (
		<Link
			href={href}
			onClick={onClick}
			className={cn(
				"flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
				isSelected
					? "bg-muted text-foreground font-medium"
					: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
			)}
		>
			<Icon className="size-4 shrink-0 opacity-60" />
			<span className="truncate">{channel.name}</span>
		</Link>
	);
}

function ChannelsSidebar({
	channels,
	selectedChannelId,
	serverDiscordId,
	tenantMode,
}: {
	channels: CommunityPageHeaderData["channels"];
	selectedChannelId: bigint | null;
	serverDiscordId: bigint;
	tenantMode: boolean;
}) {
	return (
		<aside className="w-52 shrink-0">
			<div className="sticky top-[calc(var(--navbar-height)+1.5rem)]">
				<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide px-2 mb-2">
					Channels
				</div>
				<nav className="space-y-0.5">
					{channels.map((channel) => {
						const isSelected = channel.id === selectedChannelId;
						return (
							<ChannelLink
								key={channel.id.toString()}
								channel={channel}
								isSelected={isSelected}
								href={getChannelHref({
									channelId: channel.id,
									isSelected,
									serverDiscordId,
									tenantMode,
								})}
							/>
						);
					})}
				</nav>
			</div>
		</aside>
	);
}

function MobileChannelSheet({
	channels,
	selectedChannelId,
	serverDiscordId,
	tenantMode,
}: {
	channels: CommunityPageHeaderData["channels"];
	selectedChannelId: bigint | null;
	serverDiscordId: bigint;
	tenantMode: boolean;
}) {
	const [open, setOpen] = useState(false);

	const selectedChannel = selectedChannelId
		? channels.find((c) => c.id === selectedChannelId)
		: null;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" className="lg:hidden gap-2">
					<Menu className="size-4" />
					<span className="truncate max-w-[140px]">
						{selectedChannel?.name ?? "Channels"}
					</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 p-0">
				<SheetHeader className="px-4 py-3 border-b">
					<SheetTitle className="text-left">Channels</SheetTitle>
				</SheetHeader>
				<nav className="p-2 space-y-0.5">
					{channels.map((channel) => {
						const isSelected = channel.id === selectedChannelId;
						return (
							<ChannelLink
								key={channel.id.toString()}
								channel={channel}
								isSelected={isSelected}
								href={getChannelHref({
									channelId: channel.id,
									isSelected,
									serverDiscordId,
									tenantMode,
								})}
								onClick={() => setOpen(false)}
							/>
						);
					})}
				</nav>
			</SheetContent>
		</Sheet>
	);
}

function ServerHeader({
	server,
}: {
	server: CommunityPageHeaderData["server"];
}) {
	const inviteUrl = server.inviteCode
		? `https://discord.gg/${server.inviteCode}`
		: `https://discord.com/servers/${server.discordId}`;

	const description =
		server.description ??
		`Browse and search through archived Discord discussions from ${server.name}`;

	return (
		<div className="border-b">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex items-start gap-4">
					<ServerIcon
						server={{
							discordId: server.discordId,
							name: server.name,
							icon: server.icon ?? "",
						}}
						size={64}
						className="shrink-0"
					/>
					<div className="flex-1 min-w-0">
						<div className="flex items-start gap-4">
							<div className="flex-1 min-w-0">
								<h1 className="text-xl sm:text-2xl font-semibold text-foreground">
									{server.name}
								</h1>
								<p className="text-muted-foreground text-sm mt-1 line-clamp-2">
									{description}
								</p>
							</div>
							<Button size="sm" asChild className="shrink-0">
								<a href={inviteUrl} target="_blank" rel="noopener noreferrer">
									Join Discord
								</a>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

type ChannelPageThreads = FunctionReturnType<
	typeof api.public.channels.getChannelPageThreads
>;

type ServerPageThreads = FunctionReturnType<
	typeof api.public.channels.getServerPageThreads
>;

function SearchResults({
	query,
	serverId,
	channelId,
	channelName,
	hideServer = false,
	onSearchWholeServer,
}: {
	query: string;
	serverId: string;
	channelId?: string;
	channelName?: string;
	hideServer?: boolean;
	onSearchWholeServer?: () => void;
}) {
	const emptyState = channelId ? (
		<Empty className="py-16">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<FileQuestion />
				</EmptyMedia>
				<EmptyTitle>No results in #{channelName}</EmptyTitle>
				<EmptyDescription>
					No messages match your search for "{query}" in this channel.
				</EmptyDescription>
			</EmptyHeader>
			{onSearchWholeServer && (
				<Button
					variant="outline"
					onClick={onSearchWholeServer}
					className="mt-4"
				>
					Search entire server instead
				</Button>
			)}
		</Empty>
	) : (
		<Empty className="py-16">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<FileQuestion />
				</EmptyMedia>
				<EmptyTitle>No results found</EmptyTitle>
				<EmptyDescription>
					No messages match your search for "{query}". Try different keywords or
					check your spelling.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);

	return (
		<ConvexInfiniteList
			query={api.public.search.publicSearch}
			queryArgs={{ query, serverId, channelId }}
			pageSize={20}
			initialLoaderCount={5}
			loader={<ThreadCardSkeleton />}
			className="space-y-4 max-h-[calc(100vh-var(--navbar-height)-theme(spacing.6)-140px-theme(spacing.6)-theme(spacing.6))] overflow-y-auto"
			emptyState={emptyState}
			renderItem={(result) => (
				<ThreadCard
					key={result.message.message.id.toString()}
					result={result}
					hideServer={hideServer}
				/>
			)}
		/>
	);
}

export function ServerThreadsList({
	serverDiscordId,
	initialData,
	nextCursor,
	currentCursor,
}: {
	serverDiscordId: bigint;
	initialData?: ServerPageThreads;
	nextCursor?: string | null;
	currentCursor?: string | null;
}) {
	return (
		<>
			<ConvexInfiniteList
				query={api.public.channels.getServerPageThreads}
				queryArgs={{ serverDiscordId }}
				pageSize={20}
				initialLoaderCount={5}
				loader={<ChannelThreadCardSkeleton />}
				initialData={initialData}
				initialCursor={currentCursor}
				className="space-y-4 max-h-[calc(100vh-var(--navbar-height)-theme(spacing.6)-140px-theme(spacing.6)-theme(spacing.6))] overflow-y-auto"
				emptyState={
					<Empty className="py-16">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FileQuestion />
							</EmptyMedia>
							<EmptyTitle>No threads found</EmptyTitle>
							<EmptyDescription>
								This server doesn't have any indexed threads yet.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				}
				renderItem={({ thread, message, channel }) => (
					<ChannelThreadCard
						key={thread.id.toString()}
						thread={thread}
						message={message}
						channel={channel}
					/>
				)}
			/>
			{nextCursor && (
				<a
					href={`?cursor=${encodeCursor(nextCursor)}`}
					className="sr-only"
					aria-hidden="true"
				>
					Next page
				</a>
			)}
		</>
	);
}

export function ThreadsList({
	channelDiscordId,
	initialData,
	nextCursor,
	currentCursor,
}: {
	channelDiscordId: bigint;
	initialData?: ChannelPageThreads;
	nextCursor?: string | null;
	currentCursor?: string | null;
}) {
	return (
		<>
			<ConvexInfiniteList
				query={api.public.channels.getChannelPageThreads}
				queryArgs={{ channelDiscordId }}
				pageSize={20}
				initialLoaderCount={5}
				loader={<ChannelThreadCardSkeleton />}
				initialData={initialData}
				initialCursor={currentCursor}
				className="space-y-4 max-h-[calc(100vh-var(--navbar-height)-theme(spacing.6)-140px-theme(spacing.6)-theme(spacing.6))] overflow-y-auto"
				emptyState={
					<Empty className="py-16">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FileQuestion />
							</EmptyMedia>
							<EmptyTitle>No threads found</EmptyTitle>
							<EmptyDescription>
								This channel doesn't have any indexed threads yet.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				}
				renderItem={({ thread, message }) => (
					<ChannelThreadCard
						key={thread.id.toString()}
						thread={thread}
						message={message}
					/>
				)}
			/>
			{nextCursor && (
				<a
					href={`?cursor=${encodeCursor(nextCursor)}`}
					className="sr-only"
					aria-hidden="true"
				>
					Next page
				</a>
			)}
		</>
	);
}

type CommunityPageContentProps = {
	server: CommunityPageHeaderData["server"];
	channels: CommunityPageHeaderData["channels"];
	selectedChannel?: CommunityPageHeaderData["selectedChannel"] | null;
	children: React.ReactNode;
};

export function CommunityPageContent({
	server,
	channels,
	selectedChannel = null,
	children,
}: CommunityPageContentProps) {
	const tenant = useTenant();
	const tenantMode = !!tenant;

	const [searchQuery, setSearchQuery] = useQueryState("q", {
		defaultValue: "",
	});
	const [searchScope, setSearchScope] = useQueryState("scope", {
		defaultValue: "channel",
	});
	const searchChannelScoped = searchScope === "channel" && selectedChannel;
	const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
	const hasQuery = debouncedSearchQuery.trim().length > 0;
	const isSearching =
		searchQuery !== debouncedSearchQuery && searchQuery.trim().length > 0;

	return (
		<div className="min-h-screen bg-background">
			<ServerHeader server={server} />

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex gap-8">
					<div className="hidden lg:block">
						<ChannelsSidebar
							channels={channels}
							selectedChannelId={selectedChannel?.id ?? null}
							serverDiscordId={server.discordId}
							tenantMode={tenantMode}
						/>
					</div>

					<main className="flex-1 min-w-0">
						<div className="flex items-center gap-4 mb-4 lg:hidden">
							<MobileChannelSheet
								channels={channels}
								selectedChannelId={selectedChannel?.id ?? null}
								serverDiscordId={server.discordId}
								tenantMode={tenantMode}
							/>
						</div>

						<div className="mb-6">
							<SearchInput
								value={searchQuery}
								onChange={(value) => {
									setSearchQuery(value || null);
									if (selectedChannel) {
										setSearchScope("channel");
									}
								}}
								placeholder={
									selectedChannel
										? `Search #${selectedChannel.name}...`
										: `Search ${server.name}...`
								}
								isSearching={isSearching}
							/>
						</div>

						{hasQuery ? (
							<SearchResults
								query={debouncedSearchQuery}
								serverId={server.discordId.toString()}
								channelId={
									searchChannelScoped
										? selectedChannel?.id.toString()
										: undefined
								}
								channelName={selectedChannel?.name}
								hideServer={tenantMode}
								onSearchWholeServer={
									selectedChannel ? () => setSearchScope("server") : undefined
								}
							/>
						) : (
							children
						)}
					</main>
				</div>
			</div>
		</div>
	);
}

export function ServerPageContent(
	props: Omit<CommunityPageContentProps, "selectedChannel">,
) {
	return <CommunityPageContent {...props} selectedChannel={null} />;
}

export function ChannelPageContent(
	props: CommunityPageContentProps & {
		selectedChannel: NonNullable<CommunityPageContentProps["selectedChannel"]>;
	},
) {
	return <CommunityPageContent {...props} />;
}
