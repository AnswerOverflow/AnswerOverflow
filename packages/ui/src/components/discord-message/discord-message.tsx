"use client";

import type { Attachment, Message } from "@packages/database/convex/schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Link } from "@packages/ui/components/link";
import { DiscordUIMessage } from "./renderer";
import type { MessageWithMetadata } from "./types";

function getDiscordAvatarUrl(
	userId: string,
	avatar?: string,
	size = 40,
): string {
	if (avatar) {
		return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.webp?size=${size}`;
	}
	const defaultAvatar = (parseInt(userId) % 5).toString();
	return `/discord/${defaultAvatar}.png`;
}

function getSnowflakeDate(snowflake: string): Date {
	const timestamp = BigInt(snowflake) >> 22n;
	return new Date(Number(timestamp) + 1420070400000);
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

export type DiscordMessageProps = {
	message: Message;
	author: {
		id: string;
		name: string;
		avatar?: string;
	} | null;
	attachments?: Attachment[];
	reactions?: Array<{
		userId: string;
		emoji: { id: string; name: string; animated?: boolean };
	}>;
	solutions?: Message[];
	getMessageUrl?: (messageId: string) => string;
	getUserUrl?: (userId: string) => string;
	metadata?: MessageWithMetadata["metadata"];
	poll?: MessageWithMetadata["poll"];
	snapshot?: MessageWithMetadata["snapshot"];
};

export function DiscordMessage({
	message,
	author,
	attachments = [],
	reactions = [],
	solutions = [],
	getMessageUrl,
	getUserUrl,
	metadata,
	poll,
	snapshot,
}: DiscordMessageProps) {
	const messageDate = getSnowflakeDate(message.id);

	const defaultGetMessageUrl = (messageId: string) => `/m/${messageId}`;
	const defaultGetUserUrl = (userId: string) => `/u/${userId}`;

	const messageUrlGetter = getMessageUrl ?? defaultGetMessageUrl;
	const userUrlGetter = getUserUrl ?? defaultGetUserUrl;

	const messageWithMetadata: MessageWithMetadata = {
		...message,
		attachments,
		embeds: message.embeds,
		metadata: metadata ?? null,
		poll: poll ?? null,
		snapshot: snapshot ?? null,
		user: author ? { isIgnored: false } : null,
		isIgnored: false,
	};

	return (
		<div className="p-6 rounded-lg bg-card border border-border shadow-sm">
			<div className="flex items-center gap-3 mb-3">
				{author ? (
					<>
						<Avatar className="w-10 h-10">
							<AvatarImage
								src={getDiscordAvatarUrl(author.id, author.avatar)}
								alt={author.name}
							/>
							<AvatarFallback>
								{author.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<Link
								href={userUrlGetter(author.id)}
								className="font-semibold text-card-foreground hover:underline"
							>
								{author.name}
							</Link>
							<div className="text-xs text-muted-foreground">
								{formatRelativeTime(messageDate)}
							</div>
						</div>
					</>
				) : (
					<div className="text-sm text-muted-foreground">Unknown user</div>
				)}
			</div>

			<DiscordUIMessage message={messageWithMetadata} />

			{reactions.length > 0 && (
				<div className="mb-3 flex flex-wrap gap-2 mt-3">
					{reactions.map((reaction, idx: number) => {
						const emojiId = reaction.emoji.id;
						return (
							<div
								key={`${emojiId}-${idx}`}
								className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm"
							>
								{emojiId && (
									<img
										src={`https://cdn.discordapp.com/emojis/${emojiId}.${reaction.emoji.animated ? "webp" : "png"}?size=96${reaction.emoji.animated ? "&animated=true" : ""}`}
										alt="emoji"
										className="w-4 h-4"
									/>
								)}
								<span className="text-xs text-muted-foreground">1</span>
							</div>
						);
					})}
				</div>
			)}

			{solutions.length > 0 && (
				<div className="mt-4 pt-4 border-t border-border">
					<p className="text-sm font-semibold mb-3 text-green-600 dark:text-green-400">
						✓ Solutions:
					</p>
					<div className="space-y-2">
						{solutions.map((solution: Message) => (
							<Link
								key={solution.id}
								href={messageUrlGetter(solution.id)}
								className="block p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
							>
								<div className="text-sm text-card-foreground line-clamp-2">
									{solution.content}
								</div>
							</Link>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
