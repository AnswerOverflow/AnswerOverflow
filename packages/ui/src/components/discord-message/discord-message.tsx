"use client";

import type { Attachment, Message } from "@packages/database/convex/schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Badge } from "@packages/ui/components/badge";
import { makeUserIconLink } from "@packages/ui/components/discord-avatar";
import { Link } from "@packages/ui/components/link";
import { MessageTimestamp } from "@packages/ui/components/message-timestamp";
import { DiscordUIMessage } from "./renderer";
import type { MessageWithMetadata } from "./types";

export type DiscordMessageProps = {
	message: Message;
	author: {
		id: bigint;
		name: string;
		avatar?: string;
	} | null;
	attachments?: Attachment[];
	reactions?: Array<{
		userId: bigint;
		emoji: { id: bigint; name: string; animated?: boolean };
	}>;
	solutions?: Message[];
	getMessageUrl?: (messageId: string) => string;
	getUserUrl?: (userId: string) => string;
	metadata?: MessageWithMetadata["metadata"];
	poll?: MessageWithMetadata["poll"];
	snapshot?: MessageWithMetadata["snapshot"];
	showCard?: boolean;
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
	showCard = true,
}: DiscordMessageProps) {
	const defaultGetMessageUrl = (messageId: string) => `/m/${messageId}`;
	const defaultGetUserUrl = (userId: string) => `/u/${userId}`;

	const messageUrlGetter = getMessageUrl ?? defaultGetMessageUrl;
	const userUrlGetter = getUserUrl ?? defaultGetUserUrl;

	const isBot = message.applicationId !== undefined;

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
		<div
			className={
				showCard ? "p-6 rounded-lg bg-card border border-border shadow-sm" : ""
			}
		>
			<div className="flex items-center gap-3 mb-3">
				{author ? (
					<>
						<Avatar className="w-10 h-10">
							<AvatarImage
								src={makeUserIconLink(
									{
										id: author.id.toString(),
										name: author.name,
										avatar: author.avatar,
									},
									40,
								)}
								alt={author.name}
							/>
							<AvatarFallback>
								{author.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0 flex items-center gap-2">
							<Link
								href={userUrlGetter(author.id.toString())}
								className="font-semibold text-card-foreground hover:underline"
							>
								{author.name}
							</Link>
							{isBot && (
								<Badge
									variant="default"
									className="rounded-sm px-1 py-0 text-[10px] font-medium h-4 bg-blurple text-white"
								>
									APP
								</Badge>
							)}
							<MessageTimestamp
								snowflake={message.id.toString()}
								className="text-xs text-muted-foreground"
							/>
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
								key={solution.id.toString()}
								href={messageUrlGetter(solution.id.toString())}
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
