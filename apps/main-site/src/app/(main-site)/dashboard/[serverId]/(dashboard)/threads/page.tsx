"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { DiscordMessage } from "@packages/ui/components/discord-message";
import { EmptyStateCard } from "@packages/ui/components/empty";
import { Input } from "@packages/ui/components/input";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@packages/ui/components/resizable";
import { ScrollArea } from "@packages/ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useCachedPaginatedQuery } from "@packages/ui/hooks/use-cached-paginated-query";
import { useIsMobile } from "@packages/ui/hooks/use-mobile";
import { cn } from "@packages/ui/lib/utils";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	ArrowDownAZ,
	ArrowLeft,
	ArrowUpAZ,
	CheckCircle2,
	ExternalLink,
	Hash,
	Loader2,
	MessageSquare,
	Search,
	Sparkles,
	Tag,
	X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SORT_OPTIONS = ["newest", "oldest"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

const STATUS_OPTIONS = ["all", "open", "solved", "closed"] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];

const DISCORD_EPOCH = 1420070400000n;

function snowflakeToDate(snowflake: bigint): Date {
	const timestamp = Number(snowflake >> 22n) + Number(DISCORD_EPOCH);
	return new Date(timestamp);
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours === 0) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			return diffMinutes <= 1 ? "Just now" : `${diffMinutes}m ago`;
		}
		return `${diffHours}h ago`;
	}
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
	return `${Math.floor(diffDays / 365)}y ago`;
}

type ThreadItem = FunctionReturnType<
	typeof api.authenticated.threads.getThreadsForServer
>["page"][number];

function getThreadStatus(
	thread: ThreadItem["thread"],
	message: ThreadItem["message"],
) {
	if (thread.archivedTimestamp) {
		return {
			key: "closed" as const,
			label: "Closed",
			variant: "secondary" as const,
		};
	}
	if ((message?.solutions.length ?? 0) > 0) {
		return {
			key: "solved" as const,
			label: "Solved",
			variant: "default" as const,
			icon: CheckCircle2,
		};
	}
	return { key: "open" as const, label: "Open", variant: "secondary" as const };
}

function ThreadCardSkeleton() {
	return (
		<div className="p-3 border-b">
			<div className="space-y-2">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-3 w-full" />
				<div className="flex items-center gap-2">
					<Skeleton className="h-5 w-16" />
					<Skeleton className="h-3 w-12" />
				</div>
			</div>
		</div>
	);
}

function ThreadCard({
	item,
	isSelected,
	onClick,
}: {
	item: ThreadItem;
	isSelected: boolean;
	onClick: () => void;
}) {
	const { thread, message, parentChannel, tags } = item;
	const createdAt = snowflakeToDate(thread.id);
	const status = getThreadStatus(thread, message);
	const contentPreview = message?.message.content.slice(0, 100);

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"w-full text-left p-3 border-b transition-colors hover:bg-accent/50",
				isSelected && "bg-accent",
			)}
		>
			<div className="space-y-1.5">
				<div className="font-medium text-sm line-clamp-1">{thread.name}</div>
				{contentPreview && (
					<div className="text-xs text-muted-foreground line-clamp-2">
						{contentPreview}
					</div>
				)}
				<div className="flex items-center gap-2 flex-wrap">
					<Badge
						variant={status.variant}
						className={cn("text-xs", status.icon && "gap-1")}
					>
						{status.icon && <status.icon className="size-2.5" />}
						{status.label}
					</Badge>
					{parentChannel && (
						<span className="text-xs text-muted-foreground flex items-center gap-1">
							<Hash className="size-3" />
							{parentChannel.name}
						</span>
					)}
					<span className="text-xs text-muted-foreground ml-auto">
						{formatRelativeTime(createdAt)}
					</span>
				</div>
				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1 pt-1">
						{tags.slice(0, 3).map((tag) => (
							<Badge
								key={tag.id.toString()}
								variant="outline"
								className="text-xs py-0"
							>
								{tag.name}
							</Badge>
						))}
						{tags.length > 3 && (
							<Badge variant="outline" className="text-xs py-0">
								+{tags.length - 3}
							</Badge>
						)}
					</div>
				)}
			</div>
		</button>
	);
}

function ThreadDetailPanel({
	item,
	onClose,
	showBackButton = false,
	serverId,
}: {
	item: ThreadItem;
	onClose: () => void;
	showBackButton?: boolean;
	serverId: string;
}) {
	const { thread, message, parentChannel, tags } = item;
	const createdAt = snowflakeToDate(thread.id);
	const status = getThreadStatus(thread, message);

	const [summary, setSummary] = useState<string | null>(null);
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

	const generateSummary = useAction(
		api.authenticated.threads_action.generateThreadSummary,
	);

	const handleGenerateSummary = async () => {
		setIsGeneratingSummary(true);
		try {
			const result = await generateSummary({
				serverId: BigInt(serverId),
				threadId: thread.id,
			});
			setSummary(result.summary);
		} catch (error) {
			console.error("Failed to generate summary:", error);
		} finally {
			setIsGeneratingSummary(false);
		}
	};

	const discordUrl = `https://discord.com/channels/${thread.serverId}/${thread.id}`;

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-start justify-between p-4 border-b shrink-0">
				{showBackButton && (
					<Button
						variant="ghost"
						size="icon"
						onClick={onClose}
						className="mr-2 shrink-0"
					>
						<ArrowLeft className="size-4" />
					</Button>
				)}
				<div className="space-y-1 min-w-0 flex-1">
					<h2 className="font-semibold text-lg line-clamp-2">{thread.name}</h2>
					<div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
						{parentChannel && (
							<span className="flex items-center gap-1">
								<Hash className="size-3.5" />
								{parentChannel.name}
							</span>
						)}
						<span>{formatRelativeTime(createdAt)}</span>
						<Badge
							variant={status.variant}
							className={cn("text-xs", status.icon && "gap-1")}
						>
							{status.icon && <status.icon className="size-3" />}
							{status.label}
						</Badge>
					</div>
					{tags.length > 0 && (
						<div className="flex flex-wrap gap-1 pt-1">
							{tags.map((tag) => (
								<Badge
									key={tag.id.toString()}
									variant="outline"
									className="text-xs"
								>
									{tag.name}
								</Badge>
							))}
						</div>
					)}
				</div>
				<div className="flex items-center gap-1 ml-2 shrink-0">
					<Button variant="ghost" size="icon" asChild>
						<a href={discordUrl} target="_blank" rel="noopener noreferrer">
							<ExternalLink className="size-4" />
						</a>
					</Button>
					{!showBackButton && (
						<Button variant="ghost" size="icon" onClick={onClose}>
							<X className="size-4" />
						</Button>
					)}
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-4 space-y-4">
					<div className="rounded-lg border bg-muted/30 p-4 space-y-3">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-medium flex items-center gap-2">
								<Sparkles className="size-4 text-primary" />
								AI Summary
							</h3>
							<Button
								variant="outline"
								size="sm"
								onClick={handleGenerateSummary}
								disabled={isGeneratingSummary}
							>
								{isGeneratingSummary ? (
									<>
										<Loader2 className="size-4 mr-2 animate-spin" />
										Generating...
									</>
								) : summary ? (
									"Regenerate"
								) : (
									"Generate Summary"
								)}
							</Button>
						</div>
						{summary ? (
							<p className="text-sm text-muted-foreground">{summary}</p>
						) : (
							<p className="text-sm text-muted-foreground italic">
								Click "Generate Summary" to create an AI-powered summary of this
								thread.
							</p>
						)}
					</div>

					{message ? (
						<div className="rounded-lg border bg-card overflow-hidden">
							<div className="p-4">
								<DiscordMessage enrichedMessage={message} showCard={false} />
							</div>
						</div>
					) : (
						<div className="text-center text-muted-foreground py-8">
							No message content available
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

function ThreadDetailEmpty() {
	return (
		<div className="h-full flex items-center justify-center text-muted-foreground">
			<div className="text-center space-y-2">
				<MessageSquare className="size-12 mx-auto opacity-50" />
				<p>Select a thread to view details</p>
			</div>
		</div>
	);
}

function useIntersectionObserver(onIntersect: () => void, enabled: boolean) {
	const ref = useRef<HTMLDivElement>(null);
	const onIntersectRef = useRef(onIntersect);
	onIntersectRef.current = onIntersect;

	useEffect(() => {
		if (!enabled) return;

		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					onIntersectRef.current();
				}
			},
			{ rootMargin: "100%" },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [enabled]);

	return ref;
}

export default function ThreadsPage() {
	const params = useParams();
	const serverId = params.serverId as string;
	const session = useSession({ allowAnonymous: false });
	const isMobile = useIsMobile();

	const [searchQuery, setSearchQuery] = useQueryState("search", {
		defaultValue: "",
	});
	const [sortOrder, setSortOrder] = useQueryState(
		"sort",
		parseAsStringLiteral(SORT_OPTIONS).withDefault("newest"),
	);
	const [statusFilter, setStatusFilter] = useQueryState(
		"status",
		parseAsStringLiteral(STATUS_OPTIONS).withDefault("all"),
	);
	const [channelFilter, setChannelFilter] = useQueryState("channel", {
		defaultValue: "",
	});
	const [tagFilter, setTagFilter] = useQueryState("tag", {
		defaultValue: "",
	});
	const [selectedThreadId, setSelectedThreadId] = useQueryState("thread", {
		defaultValue: "",
	});

	const { results, status, loadMore } = useCachedPaginatedQuery(
		api.authenticated.threads.getThreadsForServer,
		session?.data
			? {
					serverId: BigInt(serverId),
					sortOrder,
				}
			: "skip",
		{ initialNumItems: 50 },
	);

	const canLoadMore = status === "CanLoadMore";
	const isLoadingMore = status === "LoadingMore";
	const isLoadingFirstPage = status === "LoadingFirstPage";

	const handleLoadMore = useCallback(() => {
		if (canLoadMore) {
			loadMore(50);
		}
	}, [canLoadMore, loadMore]);

	const sentinelRef = useIntersectionObserver(handleLoadMore, canLoadMore);

	const parentChannels = useMemo(() => {
		if (!results) return [];
		const channelMap = new Map<string, { id: bigint; name: string }>();
		for (const item of results) {
			if (item.parentChannel) {
				channelMap.set(item.parentChannel.id.toString(), {
					id: item.parentChannel.id,
					name: item.parentChannel.name,
				});
			}
		}
		return Array.from(channelMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [results]);

	const allTags = useMemo(() => {
		if (!results) return [];
		const tagMap = new Map<string, { id: bigint; name: string }>();
		for (const item of results) {
			for (const tag of item.tags) {
				tagMap.set(tag.id.toString(), { id: tag.id, name: tag.name });
			}
		}
		return Array.from(tagMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [results]);

	const filteredThreads = useMemo(() => {
		if (!results) return [];

		let filtered = results;

		const query = searchQuery?.toLowerCase().trim();
		if (query) {
			filtered = filtered.filter(
				(item) =>
					item.thread.name.toLowerCase().includes(query) ||
					item.message?.message.content.toLowerCase().includes(query),
			);
		}

		if (statusFilter !== "all") {
			filtered = filtered.filter((item) => {
				const threadStatus = getThreadStatus(item.thread, item.message);
				return threadStatus.key === statusFilter;
			});
		}

		if (channelFilter) {
			filtered = filtered.filter(
				(item) => item.parentChannel?.id.toString() === channelFilter,
			);
		}

		if (tagFilter) {
			filtered = filtered.filter((item) =>
				item.tags.some((tag) => tag.id.toString() === tagFilter),
			);
		}

		return filtered;
	}, [results, searchQuery, statusFilter, channelFilter, tagFilter]);

	const selectedThread = useMemo(() => {
		if (!selectedThreadId || !filteredThreads.length) return null;
		return (
			filteredThreads.find(
				(item) => item.thread.id.toString() === selectedThreadId,
			) ?? null
		);
	}, [selectedThreadId, filteredThreads]);

	if (isLoadingFirstPage) {
		return null;
	}

	if (results && results.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No threads found</CardTitle>
					<CardDescription>
						No threads are available for this server yet. Threads will appear
						here once they are indexed from your Discord channels.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className="h-[calc(100vh-180px)] flex flex-col">
			<div className="pb-4 space-y-4">
				<div>
					<h1 className="text-2xl font-semibold">Threads</h1>
					<p className="text-muted-foreground mt-1">
						View and manage threads from your server
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<div className="relative flex-1 min-w-[200px] max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
						<Input
							type="search"
							placeholder="Search threads..."
							value={searchQuery ?? ""}
							onChange={(e) => setSearchQuery(e.target.value || null)}
							className="pl-9"
						/>
					</div>

					<Select
						value={statusFilter}
						onValueChange={(value: StatusOption) => setStatusFilter(value)}
					>
						<SelectTrigger className="w-[130px]">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="open">Open</SelectItem>
							<SelectItem value="solved">Solved</SelectItem>
							<SelectItem value="closed">Closed</SelectItem>
						</SelectContent>
					</Select>

					{parentChannels.length > 0 && (
						<Select
							value={channelFilter || "all"}
							onValueChange={(value) =>
								setChannelFilter(value === "all" ? null : value)
							}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Channel" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Channels</SelectItem>
								{parentChannels.map((channel) => (
									<SelectItem
										key={channel.id.toString()}
										value={channel.id.toString()}
									>
										<span className="flex items-center gap-1.5">
											<Hash className="size-3.5" />
											{channel.name}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					{allTags.length > 0 && (
						<Select
							value={tagFilter || "all"}
							onValueChange={(value) =>
								setTagFilter(value === "all" ? null : value)
							}
						>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Tag" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Tags</SelectItem>
								{allTags.map((tag) => (
									<SelectItem key={tag.id.toString()} value={tag.id.toString()}>
										<span className="flex items-center gap-1.5">
											<Tag className="size-3.5" />
											{tag.name}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					<Select
						value={sortOrder}
						onValueChange={(value: SortOption) => setSortOrder(value)}
					>
						<SelectTrigger className="w-[130px]">
							<SelectValue placeholder="Sort" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="newest">
								<span className="flex items-center gap-1.5">
									<ArrowDownAZ className="size-3.5" />
									Newest
								</span>
							</SelectItem>
							<SelectItem value="oldest">
								<span className="flex items-center gap-1.5">
									<ArrowUpAZ className="size-3.5" />
									Oldest
								</span>
							</SelectItem>
						</SelectContent>
					</Select>

					<div className="text-sm text-muted-foreground ml-auto">
						{filteredThreads.length} thread
						{filteredThreads.length !== 1 ? "s" : ""}
					</div>
				</div>
			</div>

			{filteredThreads.length === 0 &&
			(searchQuery || statusFilter !== "all" || channelFilter || tagFilter) ? (
				<EmptyStateCard
					icon={MessageSquare}
					title="No threads match your filters"
					description="Try adjusting your search or filter criteria."
				/>
			) : isMobile ? (
				<div className="flex-1 border rounded-lg overflow-hidden min-h-0">
					{selectedThread ? (
						<ThreadDetailPanel
							item={selectedThread}
							onClose={() => setSelectedThreadId(null)}
							showBackButton
							serverId={serverId}
						/>
					) : (
						<ScrollArea className="h-full">
							<div>
								{filteredThreads.map((item) => (
									<ThreadCard
										key={item.thread._id}
										item={item}
										isSelected={false}
										onClick={() =>
											setSelectedThreadId(item.thread.id.toString())
										}
									/>
								))}
								{isLoadingMore &&
									Array.from({ length: 3 }).map((_, i) => (
										<ThreadCardSkeleton key={`loading-${i}`} />
									))}
								{canLoadMore && <div ref={sentinelRef} className="h-4" />}
							</div>
						</ScrollArea>
					)}
				</div>
			) : (
				<div className="flex-1 border rounded-lg overflow-hidden min-h-0">
					<ResizablePanelGroup direction="horizontal" className="h-full">
						<ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
							<ScrollArea className="h-full">
								<div>
									{filteredThreads.map((item) => (
										<ThreadCard
											key={item.thread._id}
											item={item}
											isSelected={
												item.thread.id.toString() === selectedThreadId
											}
											onClick={() =>
												setSelectedThreadId(item.thread.id.toString())
											}
										/>
									))}
									{isLoadingMore &&
										Array.from({ length: 3 }).map((_, i) => (
											<ThreadCardSkeleton key={`loading-${i}`} />
										))}
									{canLoadMore && <div ref={sentinelRef} className="h-4" />}
								</div>
							</ScrollArea>
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={60} minSize={30}>
							{selectedThread ? (
								<ThreadDetailPanel
									item={selectedThread}
									onClose={() => setSelectedThreadId(null)}
									serverId={serverId}
								/>
							) : (
								<ThreadDetailEmpty />
							)}
						</ResizablePanel>
					</ResizablePanelGroup>
				</div>
			)}
		</div>
	);
}
