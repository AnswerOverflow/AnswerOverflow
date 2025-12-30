"use client";

import { api } from "@packages/database/convex/_generated/api";
import { Badge } from "@packages/ui/components/badge";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { EmptyStateCard } from "@packages/ui/components/empty";
import { Input } from "@packages/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@packages/ui/components/select";
import { Skeleton } from "@packages/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@packages/ui/components/table";
import { useCachedPaginatedQuery } from "@packages/ui/hooks/use-cached-paginated-query";
import type { FunctionReturnType } from "convex/server";
import { ChannelType } from "discord-api-types/v10";
import {
	ArrowDownAZ,
	ArrowUpAZ,
	CheckCircle2,
	Hash,
	MessageSquare,
	Search,
	Tag,
} from "lucide-react";
import { useParams } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import React, { useCallback, useEffect, useMemo, useRef } from "react";

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

function getThreadTypeInfo(type: number) {
	switch (type) {
		case ChannelType.GuildForum:
		case ChannelType.PublicThread:
			return { icon: MessageSquare, label: "Thread" };
		case ChannelType.AnnouncementThread:
			return { icon: MessageSquare, label: "Announcement Thread" };
		case ChannelType.PrivateThread:
			return { icon: MessageSquare, label: "Private Thread" };
		default:
			return { icon: Hash, label: "Thread" };
	}
}

type ThreadItem = FunctionReturnType<
	typeof api.authenticated.threads.getThreadsForServer
>["page"][number];

function ThreadRowSkeleton() {
	return (
		<TableRow>
			<TableCell className="pl-6">
				<div className="flex items-start gap-3">
					<Skeleton className="size-4 mt-1" />
					<div className="space-y-2">
						<Skeleton className="h-4 w-48" />
						<Skeleton className="h-3 w-64" />
					</div>
				</div>
			</TableCell>
			<TableCell>
				<Skeleton className="h-4 w-24" />
			</TableCell>
			<TableCell>
				<Skeleton className="h-5 w-16" />
			</TableCell>
			<TableCell>
				<Skeleton className="h-5 w-20" />
			</TableCell>
			<TableCell className="text-right pr-6">
				<Skeleton className="h-4 w-16 ml-auto" />
			</TableCell>
		</TableRow>
	);
}

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

function ThreadRow({ item }: { item: ThreadItem }) {
	const { thread, message, parentChannel, tags } = item;
	const createdAt = snowflakeToDate(thread.id);
	const { icon: TypeIcon } = getThreadTypeInfo(thread.type);
	const status = getThreadStatus(thread, message);
	const contentPreview = message?.message.content.slice(0, 200);

	return (
		<TableRow>
			<TableCell className="pl-6">
				<div className="flex items-start gap-3">
					<TypeIcon className="size-4 mt-1 shrink-0 text-muted-foreground" />
					<div className="min-w-0">
						<div className="font-medium truncate">{thread.name}</div>
						{contentPreview && (
							<div className="text-sm text-muted-foreground truncate max-w-[300px]">
								{contentPreview}
							</div>
						)}
					</div>
				</div>
			</TableCell>
			<TableCell>
				{parentChannel ? (
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Hash className="size-3.5" />
						<span className="truncate max-w-[120px]">{parentChannel.name}</span>
					</div>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell>
				<Badge variant={status.variant} className={status.icon ? "gap-1" : ""}>
					{status.icon && <status.icon className="size-3" />}
					{status.label}
				</Badge>
			</TableCell>
			<TableCell>
				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{tags.slice(0, 2).map((tag) => (
							<Badge
								key={tag.id.toString()}
								variant="outline"
								className="text-xs"
							>
								{tag.name}
							</Badge>
						))}
						{tags.length > 2 && (
							<Badge variant="outline" className="text-xs">
								+{tags.length - 2}
							</Badge>
						)}
					</div>
				)}
			</TableCell>
			<TableCell className="text-right text-sm text-muted-foreground pr-6">
				{formatRelativeTime(createdAt)}
			</TableCell>
		</TableRow>
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

	const { results, status, loadMore } = useCachedPaginatedQuery(
		api.authenticated.threads.getThreadsForServer,
		session?.data
			? {
					serverId: BigInt(serverId),
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

		if (sortOrder === "oldest") {
			filtered = [...filtered].sort((a, b) =>
				a.thread.id < b.thread.id ? -1 : 1,
			);
		}

		return filtered;
	}, [results, searchQuery, statusFilter, channelFilter, tagFilter, sortOrder]);

	if (isLoadingFirstPage) {
		return (
			<div className="mx-auto max-w-[1200px] w-full space-y-6">
				<div>
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-5 w-64 mt-2" />
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Skeleton className="h-10 w-[200px]" />
					<Skeleton className="h-10 w-[130px]" />
					<Skeleton className="h-10 w-[180px]" />
					<Skeleton className="h-10 w-[150px]" />
					<Skeleton className="h-10 w-[130px]" />
				</div>
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[40%] pl-6">Thread</TableHead>
								<TableHead>Channel</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Tags</TableHead>
								<TableHead className="text-right pr-6">Created</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 10 }).map((_, i) => (
								<ThreadRowSkeleton key={i} />
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		);
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
		<div className="mx-auto max-w-[1200px] w-full space-y-6">
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

			{filteredThreads.length === 0 &&
			(searchQuery || statusFilter !== "all" || channelFilter || tagFilter) ? (
				<EmptyStateCard
					icon={MessageSquare}
					title="No threads match your filters"
					description="Try adjusting your search or filter criteria."
				/>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[40%] pl-6">Thread</TableHead>
								<TableHead>Channel</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Tags</TableHead>
								<TableHead className="text-right pr-6">Created</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredThreads.map((item) => (
								<ThreadRow key={item.thread._id} item={item} />
							))}
							{isLoadingMore &&
								Array.from({ length: 3 }).map((_, i) => (
									<ThreadRowSkeleton key={`loading-${i}`} />
								))}
						</TableBody>
					</Table>
					{canLoadMore && <div ref={sentinelRef} className="h-4" />}
				</div>
			)}
		</div>
	);
}
