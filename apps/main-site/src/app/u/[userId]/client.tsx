"use client";

import { convexQuery } from "@convex-dev/react-query";
import type { DiscordAccount, Message } from "@packages/database/convex/schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { api } from "../../../../../../packages/database/convex/_generated/api";

// Helper to get Discord avatar URL
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

export function UserPageClient(props: {
	user: DiscordAccount;
	messages: Message[];
}) {
	// Fetch live updates for messages
	const { data: liveMessages } = useQuery({
		...convexQuery(api.public.messages.findMessagesByAuthorId, {
			authorId: props.user.id,
			limit: 50,
		}),
	});

	const messages = liveMessages ?? props.messages;

	// Get unique server IDs and channel IDs
	const serverIds = useMemo(
		() => [...new Set(messages.map((m) => m.serverId))],
		[messages],
	);
	const channelIds = useMemo(
		() => [...new Set(messages.map((m) => m.channelId))],
		[messages],
	);

	// Fetch servers and channels
	const { data: servers } = useQuery({
		...convexQuery(api.public.servers.publicFindManyServersById, {
			ids: serverIds,
		}),
		enabled: serverIds.length > 0,
	});

	const { data: channels } = useQuery({
		...convexQuery(api.public.channels.findManyChannelsById, {
			ids: channelIds,
		}),
		enabled: channelIds.length > 0,
	});

	const serverMap = useMemo(
		() => new Map((servers ?? []).map((s) => [s._id, s])),
		[servers],
	);
	const channelMap = useMemo(
		() => new Map((channels ?? []).map((c) => [c.id, c])),
		[channels],
	);

	return (
		<div className="max-w-4xl mx-auto p-8">
			{/* User Header */}
			<div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
				<div className="flex items-center gap-4">
					<Avatar className="w-20 h-20">
						<AvatarImage
							src={getDiscordAvatarUrl(props.user.id, props.user.avatar, 128)}
							alt={props.user.name}
						/>
						<AvatarFallback className="text-2xl">
							{props.user.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div>
						<h1 className="text-3xl font-bold mb-2">{props.user.name}</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							{messages.length} message{messages.length !== 1 ? "s" : ""}
						</p>
					</div>
				</div>
			</div>

			{/* Messages */}
			<div className="space-y-4">
				{messages.length === 0 ? (
					<div className="text-center text-gray-500 dark:text-gray-400 py-12">
						No messages found
					</div>
				) : (
					messages.map((message) => {
						const server = serverMap.get(message.serverId);
						const channel = channelMap.get(message.channelId);
						const messageDate = getSnowflakeDate(message.id);

						return (
							<div
								key={message.id}
								className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
							>
								<div className="flex items-start gap-3">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
											{server && (
												<Link
													href={`/c/${server.discordId}`}
													className="hover:underline font-medium"
												>
													{server.name}
												</Link>
											)}
											{server && channel && <span>•</span>}
											{channel && (
												<Link
													href={`/c/${server?.discordId ?? ""}/${channel.id}`}
													className="hover:underline"
												>
													#{channel.name}
												</Link>
											)}
											<span className="ml-auto">
												{formatRelativeTime(messageDate)}
											</span>
										</div>
										<div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words mb-2">
											{message.content || (
												<span className="italic text-gray-500 dark:text-gray-400">
													(No content)
												</span>
											)}
										</div>
										<Link
											href={`/m/${message.id}`}
											className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
										>
											View message →
										</Link>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
