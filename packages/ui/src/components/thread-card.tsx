"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import { CheckCircle2, Hash, MessageSquare } from "lucide-react";
import { ThreadIcon } from "./discord-message/mention";
import { Link } from "./link";
import { MessagePreviewCardBody } from "./message-preview-card";
import { ServerIcon } from "./server-icon";
import { Skeleton } from "./skeleton";

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare;
	return Hash;
}

export type ChannelThreadCardProps = {
	thread: {
		id: bigint;
		name: string;
	};
	message: EnrichedMessage | null;
};

export function ChannelThreadCard({ thread, message }: ChannelThreadCardProps) {
	const href = `/m/${thread.id}`;
	const threadTitle =
		thread.name ||
		message?.message.content?.slice(0, 30).trim() ||
		"Untitled thread";

	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden">
			<div className="px-4 py-3 border-b border-border bg-muted/30">
				<div className="flex items-center gap-2 text-sm">
					<div className="flex items-center gap-1.5 flex-1 min-w-0">
						<ThreadIcon className="size-4 text-muted-foreground shrink-0" />
						<Link
							href={href}
							className="font-medium text-foreground hover:underline truncate"
						>
							{threadTitle}
						</Link>
					</div>
					{(message?.solutions?.length ?? 0) > 0 && (
						<div className="flex items-center gap-1 text-green-600 dark:text-green-500 shrink-0">
							<CheckCircle2 className="size-4 shrink-0" />
							<span className="font-medium">Solved</span>
						</div>
					)}
				</div>
			</div>
			{message ? (
				<MessagePreviewCardBody
					enrichedMessage={message}
					href={href}
					ariaLabel={`Open thread: ${threadTitle}`}
				/>
			) : (
				<div className="p-4">Original message was deleted</div>
			)}
		</div>
	);
}

export function ThreadCard({ result }: { result: SearchResult }) {
	const ChannelIcon = result.channel
		? getChannelIcon(result.channel.type)
		: Hash;
	const canonicalId = result.thread
		? result.message.message.channelId
		: result.message.message.id;
	const canonicalHref = `/m/${canonicalId}`;

	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden mb-4">
			<div className="px-4 py-3 border-b border-border bg-muted/30">
				<div className="flex items-center gap-2 flex-wrap text-sm">
					<div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
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
									href={canonicalHref}
									className="text-muted-foreground hover:underline"
								>
									{result.thread.name ||
										result.message.message.content?.slice(0, 30).trim() ||
										"Untitled thread"}
								</Link>
							</div>
						)}
					</div>
					{result.message.solutions.length > 0 && (
						<div className="flex items-center gap-1 text-green-600 dark:text-green-500 shrink-0">
							<CheckCircle2 className="size-4 shrink-0" />
							<span className="font-medium">Solved</span>
						</div>
					)}
				</div>
			</div>
			<MessagePreviewCardBody
				enrichedMessage={result.message}
				href={canonicalHref}
				ariaLabel={`Open message ${result.thread?.name || result.message.message.content?.slice(0, 30) || "Untitled thread"}`}
			/>
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

export function ChannelThreadCardSkeleton() {
	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden">
			<div className="px-4 py-3 border-b border-border bg-muted/30">
				<div className="flex items-center gap-2">
					<Skeleton className="size-4 shrink-0" />
					<Skeleton className="h-5 w-48" />
				</div>
			</div>
			<div className="p-4">
				<div className="flex items-start gap-4">
					<Skeleton className="size-10 rounded-full shrink-0" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
					</div>
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
