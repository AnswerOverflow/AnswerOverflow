"use client";

import { convexQuery } from "@convex-dev/react-query";
import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import type {
	Channel,
	DiscordAccount,
	Message,
	Server,
} from "@packages/database/convex/schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { BlueLink } from "@packages/ui/components/blue-link";
import { DiscordMarkdown } from "@packages/ui/markdown";
import { LinkMessage } from "@packages/ui/components/link-message";
import { MessagesSearchBar } from "@packages/ui/components/messages-search-bar";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { ServerInviteJoinButton } from "@packages/ui/components/server-invite";
import { useDebounce } from "@packages/ui/hooks/use-debounce";
import { cn } from "@packages/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Hash, MessageSquare } from "lucide-react";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

type ServerWithChannels = Server & {
	_id: Id<"servers">;
	channels: Channel[];
};

type ChannelWithName = Pick<Channel, "id" | "name" | "type"> & {
	inviteCode?: string;
};

type ThreadWithMessage = {
	thread: Channel;
	message: Message;
};

type SearchResult = {
	message: Message;
	score: number;
};

// Helper to get Discord avatar URL
function getDiscordAvatarUrl(
	userId: string,
	avatar?: string,
	size = 40,
): string {
	if (avatar) {
		return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.webp?size=${size}`;
	}
	// Default avatar based on user ID
	const defaultAvatar = (parseInt(userId) % 5).toString();
	return `/discord/${defaultAvatar}.png`;
}

// Helper to parse Discord snowflake ID to date
function getSnowflakeDate(snowflake: string): Date {
	const timestamp = BigInt(snowflake) >> 22n;
	return new Date(Number(timestamp) + 1420070400000);
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);
	const diffYears = Math.floor(diffDays / 365);

	if (diffSecs < 60) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffWeeks < 4) return `${diffWeeks}w ago`;
	if (diffMonths < 12) return `${diffMonths}mo ago`;
	if (diffYears >= 1) {
		// For very old messages, show formatted date
		return date.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}
	// Fallback (shouldn't reach here, but just in case)
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function ChannelPageClient(props: {
	server: ServerWithChannels;
	channels: ChannelWithName[];
	selectedChannel?: Channel;
	threads?: ThreadWithMessage[];
}) {
	// For now, use initial threads data since we need messages for each thread
	// TODO: Fetch messages for live threads when they update
	const threads = props.threads;

	// Read search query from URL (updates immediately)
	const [searchQuery] = useQueryState("q", parseAsString.withDefault(""));

	// Debounce the query for Convex requests
	const trimmedQuery = searchQuery?.trim() ?? "";
	const debouncedQuery = useDebounce(trimmedQuery, 300);

	const hasSearchQuery = debouncedQuery.length > 0;

	const { data: searchResults } = useQuery({
		...convexQuery(api.public.messages.searchMessages, {
			query: debouncedQuery,
			serverId: props.server._id,
			channelId: props.selectedChannel?.id,
			limit: 20,
		}),
		enabled: hasSearchQuery,
	});

	// Get unique author IDs for both search results and threads
	const searchAuthorIds = useMemo(
		() =>
			searchResults
				? [
						...new Set(
							searchResults.map((r: SearchResult) => r.message.authorId),
						),
					]
				: [],
		[searchResults],
	);
	const threadAuthorIds = useMemo(
		() => (threads ? [...new Set(threads.map((t) => t.message.authorId))] : []),
		[threads],
	);
	const allAuthorIds = useMemo(
		() => [...new Set([...searchAuthorIds, ...threadAuthorIds])],
		[searchAuthorIds, threadAuthorIds],
	);

	const channelIds = useMemo(
		() =>
			searchResults
				? [
						...new Set(
							searchResults.map((r: SearchResult) => r.message.channelId),
						),
					]
				: [],
		[searchResults],
	);

	// Fetch authors and channels for search results and threads
	const { data: authors } = useQuery({
		...convexQuery(api.public.discord_accounts.findManyDiscordAccountsById, {
			ids: allAuthorIds,
		}),
		enabled: allAuthorIds.length > 0,
	});

	const { data: channels } = useQuery({
		...convexQuery(api.public.channels.findManyChannelsById, {
			ids: channelIds,
		}),
		enabled: channelIds.length > 0,
	});

	const authorMap = useMemo(
		() => new Map((authors ?? []).map((a: DiscordAccount) => [a.id, a])),
		[authors],
	);
	const channelMap = useMemo(
		() => new Map((channels ?? []).map((c: Channel) => [c.id, c])),
		[channels],
	);

	const HeroArea = () => {
		return (
			<div className="border-b border-sidebar-border bg-sidebar">
				<div className="flex items-center gap-4 px-4 py-3 md:px-6">
					<ServerIcon server={props.server} size={40} className="shrink-0" />
					<div className="min-w-0 flex-1">
						<h1 className="truncate text-lg font-semibold text-sidebar-foreground">
							{props.server.name}
						</h1>
						{props.server.description && (
							<p className="truncate text-sm text-sidebar-foreground/70">
								{props.server.description}
							</p>
						)}
					</div>
					<div className="hidden shrink-0 md:block">
						<ServerInviteJoinButton
							server={props.server}
							location="Community Page"
							channel={props.selectedChannel}
						/>
					</div>
				</div>
			</div>
		);
	};

	const getChannelIcon = (type: number) => {
		if (type === 15) return MessageSquare; // Forum
		return Hash; // Text, Announcement, etc.
	};

	const ChannelSidebar = () => {
		return (
			<aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
				<div className="flex-1 overflow-y-auto min-h-0">
					<div className="px-2 py-3">
						<div className="mb-1 px-2">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60">
								Channels
							</h2>
						</div>
						<nav className="space-y-0.5">
							{props.channels.map((channel) => {
								const isSelected = channel.id === props.selectedChannel?.id;
								const Icon = getChannelIcon(channel.type);
								return (
									<Link
										key={channel.id}
										href={`/c/${props.server.discordId}/${channel.id}`}
										className={cn(
											"group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors relative",
											isSelected
												? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
												: "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
										)}
									>
										<Icon className="h-4 w-4 shrink-0" />
										<span className="truncate flex-1">{channel.name}</span>
										{isSelected && (
											<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-accent-foreground rounded-r-full" />
										)}
									</Link>
								);
							})}
						</nav>
					</div>
				</div>
			</aside>
		);
	};

	const ChannelsGrid = () => {
		if (props.channels.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<p className="text-muted-foreground">No channels available</p>
				</div>
			);
		}

		return (
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{props.channels.map((channel) => {
					const Icon = getChannelIcon(channel.type);
					return (
						<Link
							key={channel.id}
							href={`/c/${props.server.discordId}/${channel.id}`}
							className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-sidebar-border hover:bg-accent"
						>
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
								<Icon className="h-5 w-5" />
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="font-semibold text-card-foreground group-hover:text-accent-foreground">
									{channel.name}
								</h3>
								<p className="text-sm text-muted-foreground group-hover:text-accent-foreground/70">
									Browse threads →
								</p>
							</div>
						</Link>
					);
				})}
			</div>
		);
	};

	const ThreadsSection = () => {
		if (!props.selectedChannel) {
			return (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<h2 className="text-xl font-semibold text-foreground mb-2">
						Select a channel to view threads
					</h2>
					<p className="text-muted-foreground">
						Choose a channel from the sidebar to get started
					</p>
				</div>
			);
		}
		if (!threads || threads.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<h2 className="text-xl font-semibold text-foreground mb-2">
						No threads found
					</h2>
					<p className="text-muted-foreground">
						This channel doesn't have any threads yet
					</p>
				</div>
			);
		}

		return (
			<div className="flex w-full flex-1 flex-col gap-4">
				{threads.map(({ thread, message }) => {
					const author = authorMap.get(message.authorId);
					const messageDate = getSnowflakeDate(message.id);
					const formattedDate = formatRelativeTime(messageDate);

					return (
						<LinkMessage
							key={thread.id}
							message={message}
							thread={thread}
							author={author}
							formattedDate={formattedDate}
						/>
					);
				})}
			</div>
		);
	};

	const SearchResultsSection = () => {
		if (!hasSearchQuery) {
			return null;
		}

		if (!searchResults || searchResults.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<h2 className="text-xl font-semibold text-foreground mb-2">
						No results found
					</h2>
					<p className="text-muted-foreground">
						No messages found matching &quot;{debouncedQuery}&quot;
					</p>
				</div>
			);
		}

		return (
			<div className="flex w-full flex-1 flex-col gap-4">
				<div className="mb-2">
					<h2 className="text-lg font-semibold text-foreground">
						{searchResults.length} result{searchResults.length === 1 ? "" : "s"}{" "}
						for &quot;{debouncedQuery}&quot;
					</h2>
				</div>
				{searchResults.map((result: SearchResult) => {
					const { message } = result;
					const author = authorMap.get(message.authorId);
					const channel = channelMap.get(message.channelId);
					const messageDate = getSnowflakeDate(message.id);

					return (
						<Link
							key={message.id}
							href={`/m/${message.id}`}
							className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground transition-all hover:border-sidebar-border hover:bg-accent/50 hover:shadow-sm"
						>
							{author && (
								<Avatar className="size-10 shrink-0">
									<AvatarImage
										src={getDiscordAvatarUrl(author.id, author.avatar)}
										alt={author.name}
									/>
									<AvatarFallback>
										{author.name.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							)}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-2 text-sm">
									{author && (
										<BlueLink
											href={`/u/${author.id}`}
											className="font-semibold"
											onClick={(e) => e.stopPropagation()}
										>
											{author.name}
										</BlueLink>
									)}
									{channel && (
										<>
											<span className="text-muted-foreground">in</span>
											<Link
												href={`/c/${props.server.discordId}/${channel.id}`}
												className="text-muted-foreground hover:text-foreground hover:underline"
												onClick={(e) => e.stopPropagation()}
											>
												#{channel.name}
											</Link>
										</>
									)}
									<span className="text-muted-foreground">•</span>
									<span className="text-muted-foreground">
										{formatRelativeTime(messageDate)}
									</span>
								</div>
								<div className="text-sm text-card-foreground line-clamp-3 group-hover:text-accent-foreground">
									{message.content ? (
										<DiscordMarkdown content={message.content} />
									) : (
										<span className="italic text-muted-foreground">
											(No content)
										</span>
									)}
								</div>
							</div>
						</Link>
					);
				})}
			</div>
		);
	};

	// Compute search bar placeholder outside of render to keep it stable
	const searchBarPlaceholder = props.selectedChannel
		? `Search ${props.selectedChannel.name}...`
		: `Search the ${props.server.name} community`;

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
			<HeroArea />
			<div className="flex flex-1 min-h-0">
				{props.selectedChannel ? (
					<div className="flex flex-1 min-h-0">
						<ChannelSidebar />
						<div className="flex flex-1 flex-col min-w-0">
							<div className="border-b border-sidebar-border bg-background px-4 py-3 md:px-6">
								<div className="flex items-center gap-2">
									{(() => {
										const Icon = getChannelIcon(props.selectedChannel.type);
										return <Icon className="h-5 w-5 text-muted-foreground" />;
									})()}
									<h2 className="text-lg font-semibold text-foreground">
										{props.selectedChannel.name}
									</h2>
								</div>
							</div>
							<div className="flex-1 overflow-y-auto">
								<div className="px-4 py-6 md:px-6">
									<MessagesSearchBar
										placeholder={searchBarPlaceholder}
										serverId={props.server.discordId}
									/>
									<div className="mt-6">
										{hasSearchQuery ? (
											<SearchResultsSection />
										) : (
											<ThreadsSection />
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="flex flex-1 min-h-0">
						<ChannelSidebar />
						<div className="flex flex-1 flex-col min-w-0">
							<div className="border-b border-sidebar-border bg-background px-4 py-3 md:px-6">
								<h2 className="text-lg font-semibold text-foreground">
									Browse Channels
								</h2>
							</div>
							<div className="flex-1 overflow-y-auto">
								<div className="px-4 py-6 md:px-6">
									<MessagesSearchBar
										placeholder={searchBarPlaceholder}
										serverId={props.server.discordId}
									/>
									<div className="mt-6">
										{hasSearchQuery ? (
											<SearchResultsSection />
										) : (
											<ChannelsGrid />
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
