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
import { CheckCircle2, Hash, MessageSquare, Search } from "lucide-react";
import { useParams } from "next/navigation";
import { useQueryState } from "nuqs";
import React, { useCallback, useEffect, useRef } from "react";

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
		return { label: "Closed", variant: "secondary" as const };
	}
	if ((message?.solutions.length ?? 0) > 0) {
		return { label: "Solved", variant: "default" as const, icon: CheckCircle2 };
	}
	return { label: "Open", variant: "secondary" as const };
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

	const filteredThreads = React.useMemo(() => {
		if (!results) return [];

		const query = searchQuery?.toLowerCase().trim();
		if (!query) return results;

		return results.filter(
			(item) =>
				item.thread.name.toLowerCase().includes(query) ||
				item.message?.message.content.toLowerCase().includes(query),
		);
	}, [results, searchQuery]);

	if (isLoadingFirstPage) {
		return (
			<div className="mx-auto max-w-[1200px] w-full space-y-6">
				<div>
					<Skeleton className="h-8 w-32" />
					<Skeleton className="h-5 w-64 mt-2" />
				</div>
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-80" />
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

			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
					<Input
						type="search"
						placeholder="Search threads..."
						value={searchQuery ?? ""}
						onChange={(e) => setSearchQuery(e.target.value || null)}
						className="pl-9"
					/>
				</div>
				<div className="text-sm text-muted-foreground">
					{filteredThreads.length} thread
					{filteredThreads.length !== 1 ? "s" : ""}
				</div>
			</div>

			{filteredThreads.length === 0 && searchQuery ? (
				<EmptyStateCard
					icon={MessageSquare}
					title="No threads match your search"
					description={`No threads found matching "${searchQuery}". Try a different search term.`}
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
