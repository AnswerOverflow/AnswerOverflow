"use client";

import type {
	Attachment,
	Embed,
	Message,
	Reaction,
} from "@packages/database/convex/schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Link } from "@packages/ui/components/link";
import { DiscordMarkdown } from "@packages/ui/markdown";

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

function getDiscordEmojiUrl(emojiId: string, animated = false): string {
	return `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}`;
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

function MessageEmbed({ embed }: { embed: Embed }) {
	return (
		<div
			className="flex flex-col gap-1 rounded-lg bg-black/5 dark:bg-white/10 py-2 pl-4 pr-6 border-l-4"
			style={{
				borderLeftColor: embed.color
					? `#${embed.color.toString(16).padStart(6, "0")}`
					: undefined,
			}}
		>
			{embed.author && (
				<div className="text-sm font-semibold">{embed.author.name}</div>
			)}
			{embed.title && (
				<div className="text-lg font-bold">
					{embed.url ? (
						<a
							href={embed.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 dark:text-blue-400 hover:underline"
						>
							{embed.title}
						</a>
					) : (
						embed.title
					)}
				</div>
			)}
			{embed.description && (
				<div className="text-sm whitespace-pre-wrap break-words">
					{embed.description}
				</div>
			)}
			{embed.fields && embed.fields.length > 0 && (
				<div className="mt-2 space-y-1">
					{embed.fields.map((field, idx) => (
						<div
							key={`${field.name}-${idx}`}
							className={field.inline ? "inline-block" : "block"}
						>
							<div className="font-semibold text-sm">{field.name}</div>
							<div className="text-sm whitespace-pre-wrap break-words">
								{field.value}
							</div>
						</div>
					))}
				</div>
			)}
			{embed.image && (
				<img
					src={embed.image.proxyUrl ?? embed.image.url}
					alt={embed.title ?? "Embed image"}
					className="mt-2 rounded max-w-full"
					style={{
						maxWidth: embed.image.width ? `${embed.image.width}px` : undefined,
						maxHeight: embed.image.height
							? `${embed.image.height}px`
							: undefined,
					}}
				/>
			)}
			{embed.thumbnail && (
				<img
					src={embed.thumbnail.proxyUrl ?? embed.thumbnail.url}
					alt={embed.title ?? "Embed thumbnail"}
					className="mt-2 rounded max-w-xs"
				/>
			)}
			{embed.footer && (
				<div className="text-xs text-muted-foreground mt-2">
					{embed.footer.text}
				</div>
			)}
		</div>
	);
}

export type DiscordMessageProps = {
	message: Message;
	author: {
		id: string;
		name: string;
		avatar?: string;
	} | null;
	attachments: Attachment[];
	reactions: Reaction[];
	solutions?: Message[];
	getAttachmentUrl?: (attachment: Attachment) => string | null;
	getMessageUrl?: (messageId: string) => string;
	getUserUrl?: (userId: string) => string;
};

export function DiscordMessage({
	message,
	author,
	attachments,
	reactions,
	solutions = [],
	getAttachmentUrl,
	getMessageUrl,
	getUserUrl,
}: DiscordMessageProps) {
	const messageDate = getSnowflakeDate(message.id);

	const defaultGetAttachmentUrl = (attachment: Attachment): string | null => {
		const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
			/\.cloud$/,
			".site",
		);
		return attachment.storageId && convexSiteUrl
			? `${convexSiteUrl}/getAttachment?storageId=${attachment.storageId}`
			: null;
	};

	const defaultGetMessageUrl = (messageId: string) => `/m/${messageId}`;
	const defaultGetUserUrl = (userId: string) => `/u/${userId}`;

	const attachmentUrlGetter = getAttachmentUrl ?? defaultGetAttachmentUrl;
	const messageUrlGetter = getMessageUrl ?? defaultGetMessageUrl;
	const userUrlGetter = getUserUrl ?? defaultGetUserUrl;

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

			{message.content && (
				<div className="max-w-4xl whitespace-break-spaces pt-2 font-body text-primary [overflow-wrap:_anywhere]">
					<DiscordMarkdown content={message.content} />
				</div>
			)}

			{message.embeds && message.embeds.length > 0 && (
				<div className="mb-3 space-y-2">
					{message.embeds.map((embed, idx) => (
						<MessageEmbed key={`embed-${idx}`} embed={embed} />
					))}
				</div>
			)}

			{attachments.length > 0 && (
				<div className="mb-3 space-y-2">
					{attachments.map((attachment: Attachment) => {
						const isImage =
							attachment.contentType?.startsWith("image/") ?? false;

						const attachmentUrl = attachmentUrlGetter(attachment);

						if (!attachmentUrl) {
							return null;
						}

						return (
							<div key={attachment.id}>
								{isImage ? (
									<a
										href={attachmentUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="block"
									>
										<img
											src={attachmentUrl}
											alt={attachment.filename}
											className="max-w-full rounded-lg"
											style={{
												maxWidth: attachment.width
													? `${attachment.width}px`
													: "600px",
												maxHeight: attachment.height
													? `${attachment.height}px`
													: undefined,
											}}
										/>
									</a>
								) : (
									<a
										href={attachmentUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 p-2 rounded bg-muted hover:bg-accent transition-colors"
									>
										<span className="text-2xl">📎</span>
										<div className="flex-1 min-w-0">
											<div className="font-medium text-sm truncate text-card-foreground">
												{attachment.filename}
											</div>
											<div className="text-xs text-muted-foreground">
												{(attachment.size / 1024).toFixed(1)} KB
											</div>
										</div>
									</a>
								)}
							</div>
						);
					})}
				</div>
			)}

			{reactions.length > 0 && (
				<div className="mb-3 flex flex-wrap gap-2">
					{reactions.map((reaction: Reaction, idx: number) => {
						const emojiId = reaction.emojiId;
						return (
							<div
								key={`${emojiId}-${idx}`}
								className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm"
							>
								{emojiId && (
									<img
										src={getDiscordEmojiUrl(emojiId)}
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
