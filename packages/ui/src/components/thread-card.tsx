"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { Hash, MessageSquare } from "lucide-react";
import { DiscordMessage } from "./discord-message";
import { ThreadIcon } from "./discord-message/mention";
import { Link } from "./link";
import { ServerIcon } from "./server-icon";
import { Skeleton } from "./skeleton";

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare;
	return Hash;
}

export function ThreadCard({ result }: { result: SearchResult }) {
	const ChannelIcon = result.channel
		? getChannelIcon(result.channel.type)
		: Hash;

	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
			<div className="px-4 py-3 border-b border-border bg-muted/30">
				<div className="flex items-center gap-2 flex-wrap text-sm">
					{result.server && (
						<>
							<div className="flex items-center gap-1.5">
								<ServerIcon
									server={result.server}
									size={16}
									className="shrink-0"
								/>
								<Link
									href={`/c/${result.server.discordId}`}
									className="font-semibold text-foreground hover:underline"
								>
									{result.server.name}
								</Link>
							</div>
							<span className="text-muted-foreground">•</span>
						</>
					)}
					{result.channel && (
						<>
							<div className="flex items-center gap-1.5">
								<ChannelIcon className="size-4 text-muted-foreground shrink-0" />
								<Link
									href={`/c/${result.server?.discordId}/${result.channel.id}`}
									className="text-muted-foreground hover:underline"
								>
									{result.channel.name}
								</Link>
							</div>
							<span className="text-muted-foreground">•</span>
						</>
					)}
					{result.thread && (
						<div className="flex items-center gap-1.5">
							<ThreadIcon className="size-4 text-muted-foreground shrink-0" />
							<Link
								href={`/m/${result.message.message.id}`}
								className="text-muted-foreground hover:underline"
							>
								{result.thread.name ||
									result.message.message.content?.slice(0, 30).trim() ||
									"Untitled thread"}
							</Link>
						</div>
					)}
				</div>
			</div>
			<div className="group relative hover:bg-accent/50 transition-colors">
				<Link
					href={`/m/${result.message.message.id}`}
					className="absolute inset-0 z-0"
					aria-label={`Open message ${result.thread?.name || result.message.message.content?.slice(0, 30) || "Untitled thread"}`}
				/>
				<div className="relative z-10 pointer-events-none [&_a]:pointer-events-auto p-4">
					<div className="relative max-h-64 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0,black_12rem,transparent_16rem)]">
						<DiscordMessage enrichedMessage={result.message} showCard={false} />
					</div>
				</div>
			</div>
		</div>
	);
}

export function ThreadCardSkeleton() {
	return (
		<div className="rounded-lg border border-border bg-card p-5">
			<div className="flex items-start gap-4">
				<Skeleton className="size-10 rounded-full shrink-0" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-5 w-3/4" />
					<Skeleton className="h-4 w-1/2" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-5/6" />
				</div>
			</div>
		</div>
	);
}

export function ThreadCardSkeletonList({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map((_, i) => (
				<ThreadCardSkeleton key={`skeleton-${i}`} />
			))}
		</div>
	);
}
