"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import { CheckCircle2, Hash } from "lucide-react";
import { getChannelIcon } from "../utils/discord";
import { ThreadIcon } from "./discord-message/mention";
import { Link } from "./link";
import { MessagePreviewCardBody } from "./message-preview-card";
import { ServerIcon } from "./server-icon";
import { Skeleton } from "./skeleton";

export type ChannelThreadCardProps = {
	thread: {
		id: bigint;
		name: string;
	};
	message: EnrichedMessage | null;
	channel?: {
		id: bigint;
		name: string;
		type: number;
	} | null;
};

export function ChannelThreadCard({
	thread,
	message,
	channel,
}: ChannelThreadCardProps) {
	const href = `/m/${thread.id}`;
	const threadTitle =
		thread.name ||
		message?.message.content?.slice(0, 30).trim() ||
		"Untitled thread";

	const hasSolution = (message?.solutions?.length ?? 0) > 0;
	const ChannelIcon = channel ? getChannelIcon(channel.type) : null;

	return (
		<div className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80 hover:shadow-md">
			<div className="px-4 py-3 border-b border-border/50 bg-muted/20">
				<div className="flex items-center gap-2 text-sm">
					<div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
						{channel && ChannelIcon && (
							<>
								<div className="flex items-center gap-1.5">
									<ChannelIcon className="size-4 text-muted-foreground/70 shrink-0" />
									<span className="text-muted-foreground">{channel.name}</span>
								</div>
								<span className="text-muted-foreground/50">•</span>
							</>
						)}
						<div className="flex items-center gap-1.5 min-w-0">
							<ThreadIcon className="size-4 text-muted-foreground/70 shrink-0" />
							<Link
								href={href}
								className="font-medium text-foreground hover:text-primary hover:underline truncate transition-colors"
							>
								{threadTitle}
							</Link>
						</div>
					</div>
					{hasSolution && (
						<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full">
							<CheckCircle2 className="size-3.5" />
							<span className="text-xs font-medium">Solved</span>
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
				<div className="p-4 text-sm text-muted-foreground italic">
					Original message was deleted
				</div>
			)}
		</div>
	);
}

export type ThreadCardProps = {
	result: SearchResult;
	hideServer?: boolean;
};

export function ThreadCard({ result, hideServer = false }: ThreadCardProps) {
	const ChannelIcon = result.channel
		? getChannelIcon(result.channel.type)
		: Hash;
	const canonicalId =
		result.thread?.id ??
		result.message.message.childThreadId ??
		result.message.message.id;
	const canonicalHref = `/m/${canonicalId}`;

	const hasSolution = result.message.solutions.length > 0;
	const showServer = result.server && !hideServer;

	return (
		<div className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80 hover:shadow-md mb-4">
			<div className="px-4 py-3 border-b border-border/50 bg-muted/20">
				<div className="flex items-center gap-2 flex-wrap text-sm">
					<div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
						{showServer && (
							<>
								<div className="flex items-center gap-1.5">
									<ServerIcon
										server={result.server}
										size={16}
										className="shrink-0"
									/>
									<Link
										href={`/c/${result.server.discordId}`}
										className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
									>
										{result.server.name}
									</Link>
								</div>
								<span className="text-muted-foreground/50">•</span>
							</>
						)}
						{result.channel && (
							<>
								<div className="flex items-center gap-1.5">
									<ChannelIcon className="size-4 text-muted-foreground/70 shrink-0" />
									<Link
										href={`/c/${result.server?.discordId}/${result.channel.id}`}
										className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
									>
										{result.channel.name}
									</Link>
								</div>
								{result.thread && (
									<span className="text-muted-foreground/50">•</span>
								)}
							</>
						)}
						{result.thread && (
							<div className="flex items-center gap-1.5">
								<ThreadIcon className="size-4 text-muted-foreground/70 shrink-0" />
								<Link
									href={canonicalHref}
									className="font-medium text-foreground hover:text-primary hover:underline transition-colors truncate"
								>
									{result.thread.name ||
										result.message.message.content?.slice(0, 30).trim() ||
										"Untitled thread"}
								</Link>
							</div>
						)}
					</div>
					{hasSolution && (
						<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full">
							<CheckCircle2 className="size-3.5" />
							<span className="text-xs font-medium">Solved</span>
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

export type MessageCardProps = {
	message: EnrichedMessage;
	channel?: {
		id: bigint;
		name: string;
		type: number;
	} | null;
};

export function MessageCard({ message, channel }: MessageCardProps) {
	const href = `/m/${message.message.id}`;
	const ChannelIcon = channel ? getChannelIcon(channel.type) : Hash;
	const hasSolution = message.solutions.length > 0;

	return (
		<div className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80 hover:shadow-md">
			{channel && (
				<div className="px-4 py-3 border-b border-border/50 bg-muted/20">
					<div className="flex items-center gap-2 text-sm">
						<div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<ChannelIcon className="size-4 text-muted-foreground/70 shrink-0" />
								<span className="text-muted-foreground">{channel.name}</span>
							</div>
						</div>
						{hasSolution && (
							<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full">
								<CheckCircle2 className="size-3.5" />
								<span className="text-xs font-medium">Solved</span>
							</div>
						)}
					</div>
				</div>
			)}
			<MessagePreviewCardBody
				enrichedMessage={message}
				href={href}
				ariaLabel={`Open message: ${message.message.content?.slice(0, 30) || "Message"}`}
			/>
		</div>
	);
}

export function ChannelMessageCard({ message }: { message: EnrichedMessage }) {
	const href = `/m/${message.message.id}`;
	const hasSolution = message.solutions.length > 0;

	return (
		<div className="group rounded-xl border border-border bg-card overflow-hidden transition-all hover:border-border/80 hover:shadow-md">
			{hasSolution && (
				<div className="px-4 py-3 border-b border-border/50 bg-muted/20">
					<div className="flex items-center gap-2 text-sm justify-end">
						<div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 shrink-0 bg-emerald-500/10 px-2 py-0.5 rounded-full">
							<CheckCircle2 className="size-3.5" />
							<span className="text-xs font-medium">Solved</span>
						</div>
					</div>
				</div>
			)}
			<MessagePreviewCardBody
				enrichedMessage={message}
				href={href}
				ariaLabel={`Open message: ${message.message.content?.slice(0, 30) || "Message"}`}
			/>
		</div>
	);
}

export const MessageCardSkeleton = ThreadCardSkeleton;

export function ThreadCardSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-card overflow-hidden">
			<div className="px-4 py-3 border-b border-border/50 bg-muted/20">
				<div className="flex items-center gap-2">
					<Skeleton className="size-4 rounded shrink-0" />
					<Skeleton className="h-5 w-48" />
				</div>
			</div>
			<div className="p-4">
				<div className="flex items-start gap-3">
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

export const ChannelThreadCardSkeleton = ThreadCardSkeleton;

export function ThreadCardSkeletonList({ count = 3 }: { count?: number }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map((_, i) => (
				<ThreadCardSkeleton key={`skeleton-${i}`} />
			))}
		</div>
	);
}
