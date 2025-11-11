"use client";

import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "@packages/database/convex/_generated/dataModel";
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
import { DiscordMarkdown } from "@packages/ui/markdown";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "../../../../../../packages/database/convex/_generated/api";

type MessagePageData = {
	messages: Array<{
		message: Message;
		author: {
			id: string;
			name: string;
			avatar?: string;
		} | null;
		attachments: Attachment[];
		reactions: Reaction[];
		solutions: Message[];
	}>;
	server: {
		_id: Id<"servers">;
		discordId: string;
		name: string;
		icon?: string;
		description?: string;
	};
	channel: {
		id: string;
		name: string;
		type: number;
	};
	thread: {
		id: string;
		name: string;
		type: number;
	} | null;
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

// Helper to get Discord emoji URL
function getDiscordEmojiUrl(emojiId: string, animated = false): string {
	return `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? "gif" : "png"}`;
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

	if (diffSecs < 60) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

// Embed component
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
						// biome-ignore-next-line lint/suspicious/noArrayIndexKey: Embed fields don't have unique IDs
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
				<div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
					{embed.footer.text}
				</div>
			)}
		</div>
	);
}

export function MessagePageClient(props: { data: MessagePageData }) {
	const { data: liveData } = useQuery({
		...convexQuery(api.messages.getMessagePageData, {
			messageId: props.data.messages[0]?.message.id ?? "",
		}),
	});

	const data = liveData ?? props.data;

	if (!data) {
		return (
			<div className="max-w-4xl mx-auto p-8">
				<div className="text-center text-gray-600 dark:text-gray-400">
					Message not found
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-8">
			{/* Header */}
			<div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
				<div className="flex items-center gap-3 mb-2">
					{data.server.icon && (
						<img
							src={`https://cdn.discordapp.com/icons/${data.server.discordId}/${data.server.icon}.webp?size=64`}
							alt={data.server.name}
							className="w-12 h-12 rounded-full"
						/>
					)}
					<div>
						<h1 className="text-2xl font-bold">{data.server.name}</h1>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							#{data.channel.name}
							{data.thread && ` / ${data.thread.name}`}
						</p>
					</div>
				</div>
			</div>

			{/* Messages */}
			<div className="space-y-4">
				{data.messages.map((msgData: MessagePageData["messages"][number]) => {
					const { message, author, attachments, reactions, solutions } =
						msgData;
					const messageDate = getSnowflakeDate(message.id);

					return (
						<div
							key={message.id}
							className="p-6 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
						>
							{/* Author header */}
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
												href={`/u/${author.id}`}
												className="font-semibold text-gray-900 dark:text-gray-100 hover:underline"
											>
												{author.name}
											</Link>
											<div className="text-xs text-gray-500 dark:text-gray-400">
												{formatRelativeTime(messageDate)}
											</div>
										</div>
									</>
								) : (
									<div className="text-sm text-gray-500 dark:text-gray-400">
										Unknown user
									</div>
								)}
							</div>

							{/* Message content */}
							{message.content && (
								<div className="max-w-4xl whitespace-break-spaces pt-2 font-body text-primary [overflow-wrap:_anywhere]">
									<DiscordMarkdown content={message.content} />
								</div>
							)}

							{/* Embeds */}
							{message.embeds && message.embeds.length > 0 && (
								<div className="mb-3 space-y-2">
									{message.embeds.map((embed, idx) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: Embeds don't have unique IDs
										<MessageEmbed key={`embed-${idx}`} embed={embed} />
									))}
								</div>
							)}

							{/* Attachments */}
							{attachments.length > 0 && (
								<div className="mb-3 space-y-2">
									{attachments.map((attachment: Attachment) => {
										const isImage =
											attachment.contentType?.startsWith("image/") ?? false;

										// Get attachment URL from Convex storage if available
										const convexSiteUrl =
											process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
												/\.cloud$/,
												".site",
											);
										const attachmentUrl =
											attachment.storageId && convexSiteUrl
												? `${convexSiteUrl}/getAttachment?storageId=${attachment.storageId}`
												: null;

										// Skip if no attachment URL available
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
														className="flex items-center gap-2 p-2 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
													>
														<span className="text-2xl">📎</span>
														<div className="flex-1 min-w-0">
															<div className="font-medium text-sm truncate">
																{attachment.filename}
															</div>
															<div className="text-xs text-gray-500 dark:text-gray-400">
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

							{/* Reactions */}
							{reactions.length > 0 && (
								<div className="mb-3 flex flex-wrap gap-2">
									{reactions.map((reaction: Reaction, idx: number) => {
										// Group reactions by emoji
										const emojiId = reaction.emojiId;
										return (
											// biome-ignore-next-line lint/suspicious/noArrayIndexKey: Using emojiId + idx for uniqueness
											<div
												key={`${emojiId}-${idx}`}
												className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm"
											>
												{emojiId && (
													<img
														src={getDiscordEmojiUrl(emojiId)}
														alt="emoji"
														className="w-4 h-4"
													/>
												)}
												<span className="text-xs text-gray-600 dark:text-gray-400">
													1
												</span>
											</div>
										);
									})}
								</div>
							)}

							{/* Solutions */}
							{solutions.length > 0 && (
								<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
									<p className="text-sm font-semibold mb-3 text-green-600 dark:text-green-400">
										✓ Solutions:
									</p>
									<div className="space-y-2">
										{solutions.map((solution: Message) => (
											<Link
												key={solution.id}
												href={`/m/${solution.id}`}
												className="block p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
											>
												<div className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
													{solution.content}
												</div>
											</Link>
										))}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
