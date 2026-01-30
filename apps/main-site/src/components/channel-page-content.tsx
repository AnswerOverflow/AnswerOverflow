"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { ForumTag } from "@packages/database/convex/schema";
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
import { ServerInviteJoinButton } from "@packages/ui/components/server-invite";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@packages/ui/components/sheet";
import { useTenant } from "@packages/ui/components/tenant-context";
import {
	ChannelMessageCard,
	ChannelThreadCard,
	ChannelThreadCardSkeleton,
	MessageCardSkeleton,
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { TrackLoad } from "@packages/ui/components/track-load";
import { cn } from "@packages/ui/lib/utils";
import { encodeCursor } from "@packages/ui/utils/cursor";
import { ChannelType, getChannelIcon } from "@packages/ui/utils/discord";
import { getTenantCanonicalUrl } from "@packages/ui/utils/links";
import type { FunctionReturnType } from "convex/server";
import { FileQuestion, Menu } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { JsonLdScript } from "./json-ld-script";
import { ResourcesSidebar } from "./resources-sidebar";
import { TagFilter } from "./tag-filter";

export type FirstThreadAuthor = {
	id: string;
	name: string;
	avatar?: string;
} | null;

type CommunityPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.public.channels.getCommunityPageHeaderData>
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

function GroupedChannelList({
	channels,
	categories,
	selectedChannelId,
	serverDiscordId,
	tenantMode,
	onChannelClick,
}: {
	channels: CommunityPageHeaderData["channels"];
	categories: CommunityPageHeaderData["categories"];
	selectedChannelId: bigint | null;
	serverDiscordId: bigint;
	tenantMode: boolean;
	onChannelClick?: () => void;
}) {
	const categoryMap = new Map(categories.map((cat) => [cat.id, cat]));

	const uncategorizedChannels = channels.filter((c) => !c.categoryId);
	const categorizedChannels = channels.filter((c) => c.categoryId);

	const channelsByCategory = new Map<bigint, typeof channels>();
	for (const channel of categorizedChannels) {
		if (!channel.categoryId) continue;
		const existing = channelsByCategory.get(channel.categoryId) ?? [];
		existing.push(channel);
		channelsByCategory.set(channel.categoryId, existing);
	}

	const sortedCategoryIds = [...channelsByCategory.keys()].sort((a, b) => {
		const catA = categoryMap.get(a);
		const catB = categoryMap.get(b);
		return (catA?.position ?? 0) - (catB?.position ?? 0);
	});

	return (
		<nav className="space-y-3">
			{uncategorizedChannels.length > 0 && (
				<div className="space-y-0.5">
					{uncategorizedChannels.map((channel) => {
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
								onClick={onChannelClick}
							/>
						);
					})}
				</div>
			)}
			{sortedCategoryIds.map((categoryId) => {
				const category = categoryMap.get(categoryId);
				const categoryChannels = channelsByCategory.get(categoryId) ?? [];
				if (categoryChannels.length === 0) return null;

				return (
					<div key={categoryId.toString()}>
						<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide px-2 mb-1">
							{category?.name ?? "Unknown"}
						</div>
						<div className="space-y-0.5">
							{categoryChannels.map((channel) => {
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
										onClick={onChannelClick}
									/>
								);
							})}
						</div>
					</div>
				);
			})}
		</nav>
	);
}

function ChannelsSidebar({
	channels,
	categories,
	selectedChannelId,
	serverDiscordId,
	tenantMode,
	sponsorUrl,
}: {
	channels: CommunityPageHeaderData["channels"];
	categories: CommunityPageHeaderData["categories"];
	selectedChannelId: bigint | null;
	serverDiscordId: bigint;
	tenantMode: boolean;
	sponsorUrl?: string | null;
}) {
	const hasCategories = categories.length > 0;
	return (
		<aside className="w-52 shrink-0">
			<div className="sticky top-[calc(var(--navbar-height)+1.5rem)]">
				<ResourcesSidebar className="mb-4 px-2" sponsorUrl={sponsorUrl} />
				{!hasCategories && (
					<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide px-2 mb-2">
						Channels
					</div>
				)}
				<GroupedChannelList
					channels={channels}
					categories={categories}
					selectedChannelId={selectedChannelId}
					serverDiscordId={serverDiscordId}
					tenantMode={tenantMode}
				/>
			</div>
		</aside>
	);
}

function MobileChannelSheet({
	channels,
	categories,
	selectedChannelId,
	serverDiscordId,
	tenantMode,
	sponsorUrl,
}: {
	channels: CommunityPageHeaderData["channels"];
	categories: CommunityPageHeaderData["categories"];
	selectedChannelId: bigint | null;
	serverDiscordId: bigint;
	tenantMode: boolean;
	sponsorUrl?: string | null;
}) {
	const [open, setOpen] = useState(false);
	const hasCategories = categories.length > 0;

	const selectedChannel = selectedChannelId
		? channels.find((c) => c.id === selectedChannelId)
		: null;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="lg:hidden gap-2 w-full justify-start"
				>
					<Menu className="size-4" />
					<span className="truncate">
						{selectedChannel?.name ?? "Channels"}
					</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="w-72 p-0">
				<SheetHeader className="px-4 py-3 border-b">
					<SheetTitle className="text-left">Navigation</SheetTitle>
				</SheetHeader>
				<div className="p-2">
					<ResourcesSidebar className="mb-4 px-2" sponsorUrl={sponsorUrl} />
					{!hasCategories && (
						<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide px-2 mb-2">
							Channels
						</div>
					)}
					<GroupedChannelList
						channels={channels}
						categories={categories}
						selectedChannelId={selectedChannelId}
						serverDiscordId={serverDiscordId}
						tenantMode={tenantMode}
						onChannelClick={() => setOpen(false)}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function ServerHeader({
	server,
}: {
	server: CommunityPageHeaderData["server"];
}) {
	const description =
		server.description ??
		`Explore the ${server.name} community Discord server on the web. Search and browse discussions, find answers, and join the conversation.`;

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
									{server.name} Discord Server
								</h1>
								<p className="text-muted-foreground text-sm mt-1 line-clamp-2">
									{description}
								</p>
							</div>
							<ServerInviteJoinButton
								server={{
									discordId: server.discordId,
									name: server.name,
									icon: server.icon,
									vanityInviteCode: server.inviteCode,
								}}
								location="Community Page"
								size="sm"
								className="shrink-0"
							/>
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

type ChannelPageMessages = FunctionReturnType<
	typeof api.public.channels.getChannelPageMessages
>;

type ServerPageThreads = FunctionReturnType<
	typeof api.public.channels.getServerPageThreads
>;

function SearchResults({
	query,
	serverId,
	channelId,
	channelName,
	tagIds,
	hideServer = false,
	onSearchWholeServer,
}: {
	query: string;
	serverId: string;
	channelId?: string;
	channelName?: string;
	tagIds?: string[];
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

	const queryTagIds = tagIds && tagIds.length > 0 ? tagIds : undefined;

	return (
		<ConvexInfiniteList
			query={api.public.search.publicSearch}
			queryArgs={{ query, serverId, channelId, tagIds: queryTagIds }}
			pageSize={20}
			initialLoaderCount={5}
			loader={<ThreadCardSkeleton />}
			className="space-y-4"
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
}: {
	serverDiscordId: bigint;
	initialData?: ServerPageThreads;
	nextCursor?: string | null;
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
				className="space-y-4"
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
}: {
	channelDiscordId: bigint;
	initialData?: ChannelPageThreads;
	nextCursor?: string | null;
}) {
	const [selectedTagIds] = useQueryState(
		"tags",
		parseAsArrayOf(parseAsString).withDefault([]),
	);
	const hasTagFilter = selectedTagIds.length > 0;
	const tagIds = hasTagFilter ? selectedTagIds : undefined;

	return (
		<>
			<ConvexInfiniteList
				query={api.public.channels.getChannelPageThreads}
				queryArgs={{ channelDiscordId, tagIds }}
				pageSize={20}
				initialLoaderCount={5}
				loader={<ChannelThreadCardSkeleton />}
				initialData={hasTagFilter ? undefined : initialData}
				className="space-y-4"
				emptyState={
					<Empty className="py-16">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FileQuestion />
							</EmptyMedia>
							<EmptyTitle>No threads found</EmptyTitle>
							<EmptyDescription>
								{hasTagFilter
									? "No threads match the selected tags."
									: "This channel doesn't have any indexed threads yet."}
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
			{!hasTagFilter && nextCursor && (
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

export function MessagesList({
	channelDiscordId,
	initialData,
	nextCursor,
}: {
	channelDiscordId: bigint;
	initialData?: ChannelPageMessages;
	nextCursor?: string | null;
}) {
	return (
		<>
			<ConvexInfiniteList
				query={api.public.channels.getChannelPageMessages}
				queryArgs={{ channelDiscordId }}
				pageSize={20}
				initialLoaderCount={5}
				loader={<MessageCardSkeleton />}
				initialData={initialData}
				className="space-y-4"
				emptyState={
					<Empty className="py-16">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FileQuestion />
							</EmptyMedia>
							<EmptyTitle>No messages found</EmptyTitle>
							<EmptyDescription>
								This channel doesn't have any indexed messages yet.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				}
				renderItem={({ message }) =>
					message ? (
						<ChannelMessageCard
							key={message.message.id.toString()}
							message={message}
						/>
					) : null
				}
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
	categories: CommunityPageHeaderData["categories"];
	selectedChannel?: CommunityPageHeaderData["selectedChannel"] | null;
	children: React.ReactNode;
	sponsorUrl?: string | null;
};

export function CommunityPageContent({
	server,
	channels,
	categories,
	selectedChannel = null,
	children,
	sponsorUrl,
}: CommunityPageContentProps) {
	const tenant = useTenant();
	const tenantMode = !!tenant;

	const [searchQuery, setSearchQuery] = useQueryState("q", {
		defaultValue: "",
	});
	const [searchScope, setSearchScope] = useQueryState("scope", {
		defaultValue: "channel",
	});
	const [selectedTagIds, setSelectedTagIds] = useQueryState(
		"tags",
		parseAsArrayOf(parseAsString).withDefault([]),
	);
	const searchChannelScoped = searchScope === "channel" && selectedChannel;
	const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
	const hasQuery = debouncedSearchQuery.trim().length > 0;
	const isSearching =
		searchQuery !== debouncedSearchQuery && searchQuery.trim().length > 0;

	const isForumChannel = selectedChannel?.type === ChannelType.GuildForum;
	const availableTags: ForumTag[] = isForumChannel
		? (selectedChannel?.availableTags ?? [])
		: [];

	const handleTagToggle = (tagId: string) => {
		if (selectedTagIds.includes(tagId)) {
			const newTags = selectedTagIds.filter((id) => id !== tagId);
			setSelectedTagIds(newTags.length > 0 ? newTags : null);
		} else {
			setSelectedTagIds([...selectedTagIds, tagId]);
		}
	};

	const handleClearTags = () => {
		setSelectedTagIds(null);
	};

	const canonicalUrl = getTenantCanonicalUrl(
		tenant,
		tenantMode ? "/" : `/c/${server.discordId.toString()}`,
	);

	const iconUrl = server.icon
		? `https://cdn.answeroverflow.com/${server.discordId}/${server.icon}/icon.png`
		: undefined;

	const communityJsonLd = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: `${server.name} Discord Server`,
		description:
			server.description ??
			`Explore the ${server.name} community Discord server on the web. Search and browse discussions, find answers, and join the conversation.`,
		url: canonicalUrl,
		logo: iconUrl,
		sameAs: server.inviteCode
			? [`https://discord.gg/${server.inviteCode}`]
			: undefined,
	};

	return (
		<div className="min-h-screen bg-background">
			<JsonLdScript data={communityJsonLd} scriptKey="community-jsonld" />
			<TrackLoad
				eventName="Community Page View"
				eventData={{
					server: {
						id: server.discordId.toString(),
						name: server.name,
					},
					channel: selectedChannel
						? {
								id: selectedChannel.id.toString(),
								name: selectedChannel.name,
								type: selectedChannel.type,
								serverId: server.discordId.toString(),
								inviteCode: selectedChannel.flags?.inviteCode ?? null,
							}
						: null,
				}}
			/>
			<ServerHeader server={server} />

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex gap-8">
					<div className="hidden lg:block">
						<ChannelsSidebar
							channels={channels}
							categories={categories}
							selectedChannelId={selectedChannel?.id ?? null}
							serverDiscordId={server.discordId}
							tenantMode={tenantMode}
							sponsorUrl={sponsorUrl}
						/>
					</div>

					<main className="flex-1 min-w-0">
						<div className="flex items-center gap-4 mb-4 lg:hidden">
							<MobileChannelSheet
								channels={channels}
								categories={categories}
								selectedChannelId={selectedChannel?.id ?? null}
								serverDiscordId={server.discordId}
								tenantMode={tenantMode}
								sponsorUrl={sponsorUrl}
							/>
						</div>

						<div className="mb-6 space-y-4">
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
							{availableTags.length > 0 && (
								<TagFilter
									availableTags={availableTags}
									selectedTagIds={selectedTagIds}
									onTagToggle={handleTagToggle}
									onClearAll={handleClearTags}
								/>
							)}
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
								tagIds={searchChannelScoped ? selectedTagIds : undefined}
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

function ChannelListSkeleton() {
	return (
		<nav className="space-y-0.5">
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded">
					<div className="size-4 rounded bg-muted animate-pulse" />
					<div className="h-4 flex-1 rounded bg-muted animate-pulse" />
				</div>
			))}
		</nav>
	);
}

function ServerHeaderSkeleton() {
	return (
		<div className="border-b">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex items-start gap-4">
					<div className="size-16 rounded-full bg-muted animate-pulse shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="flex items-start gap-4">
							<div className="flex-1 min-w-0">
								<div className="h-7 w-64 bg-muted animate-pulse rounded mb-2" />
								<div className="h-4 w-full max-w-md bg-muted animate-pulse rounded" />
							</div>
							<div className="h-9 w-20 bg-muted animate-pulse rounded shrink-0" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ResourcesSidebarSkeleton() {
	return (
		<div className="text-left px-2 mb-4">
			<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide mb-2">
				Resources
			</div>
			<nav className="space-y-0.5">
				<div className="flex items-center gap-2 py-1.5 rounded">
					<div className="size-4 rounded bg-muted animate-pulse shrink-0" />
					<div className="h-4 w-20 rounded bg-muted animate-pulse" />
				</div>
			</nav>
		</div>
	);
}

export function CommunityPageSkeleton({
	threadsSkeleton,
}: {
	threadsSkeleton: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background">
			<ServerHeaderSkeleton />
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				<div className="flex gap-8">
					<div className="hidden lg:block">
						<aside className="w-52 shrink-0">
							<div className="sticky top-[calc(var(--navbar-height)+1.5rem)]">
								<ResourcesSidebarSkeleton />
								<div className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide px-2 mb-2">
									Channels
								</div>
								<ChannelListSkeleton />
							</div>
						</aside>
					</div>
					<main className="flex-1 min-w-0">
						<div className="flex items-center gap-4 mb-4 lg:hidden">
							<div className="h-9 w-full bg-muted animate-pulse rounded" />
						</div>
						<div className="mb-6">
							<div className="h-10 w-full bg-muted animate-pulse rounded" />
						</div>
						{threadsSkeleton}
					</main>
				</div>
			</div>
		</div>
	);
}
