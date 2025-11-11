"use client";

import { convexQuery } from "@convex-dev/react-query";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import type {
	ChannelSettings,
	Message,
} from "@packages/database/convex/schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Button } from "@packages/ui/components/button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "../../../../../../../packages/database/convex/_generated/api";

type Server = {
	_id: Id<"servers">;
	discordId: string;
	name: string;
	icon?: string;
	description?: string;
};

type Channel = {
	id: string;
	name: string;
	type: number;
	serverId?: Id<"servers">;
	parentId?: string;
	inviteCode?: string;
	archivedTimestamp?: number;
	solutionTagId?: string;
	lastIndexedSnowflake?: string;
	flags?: ChannelSettings;
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

export function ChannelPageClient(props: {
	server: Server;
	channel: Channel;
	messages: Message[];
}) {
	const queryClient = useQueryClient();
	const [isEnabling, setIsEnabling] = useState(false);

	// Fetch live updates for channel (to get indexing status)
	const { data: liveChannel } = useQuery({
		...convexQuery(api.public.channels.getChannelByDiscordId, {
			discordId: props.channel.id,
		}),
	});

	const channel = liveChannel ?? props.channel;

	// Fetch live updates for messages
	const { data: liveMessages } = useQuery({
		...convexQuery(api.public.messages.findMessagesByChannelId, {
			channelId: props.channel.id,
			limit: 50,
		}),
	});

	const messages = liveMessages ?? props.messages;

	// Mutation to enable indexing
	const updateChannelSettingsFlags = useMutation(
		api.dashboard_mutations.updateChannelSettingsFlags,
	);

	const handleEnableIndexing = async () => {
		setIsEnabling(true);
		try {
			await updateChannelSettingsFlags({
				channelId: props.channel.id,
				flags: {
					indexingEnabled: true,
					markSolutionEnabled: channel.flags?.markSolutionEnabled,
					sendMarkSolutionInstructionsInNewThreads:
						channel.flags?.sendMarkSolutionInstructionsInNewThreads,
					autoThreadEnabled: channel.flags?.autoThreadEnabled,
					forumGuidelinesConsentEnabled:
						channel.flags?.forumGuidelinesConsentEnabled,
				},
			});

			// Invalidate channel query to refresh the data
			queryClient.invalidateQueries({
				queryKey: [
					"convex",
					api.public.channels.getChannelByDiscordId,
					{ discordId: props.channel.id },
				],
			});
			setIsEnabling(false);
		} catch (error) {
			console.error("Failed to enable indexing:", error);
			alert(
				`Failed to enable indexing: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			setIsEnabling(false);
		}
	};

	const isIndexingEnabled = channel.flags?.indexingEnabled ?? false;

	// Get unique author IDs
	const authorIds = useMemo(
		() => [...new Set(messages.map((m) => m.authorId))],
		[messages],
	);

	// Fetch all authors in a single query
	const { data: authors } = useQuery({
		...convexQuery(api.public.discord_accounts.findManyDiscordAccountsById, {
			ids: authorIds,
		}),
		enabled: authorIds.length > 0,
	});

	const authorMap = useMemo(
		() =>
			new Map(
				(authors ?? [])
					.filter((a): a is NonNullable<typeof a> => a !== null)
					.map((a) => [a.id, a]),
			),
		[authors],
	);

	return (
		<div className="max-w-4xl mx-auto p-8">
			{/* Header */}
			<div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
				<div className="flex items-center gap-3 mb-2">
					<Link
						href={`/c/${props.server.discordId}`}
						className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
					>
						← {props.server.name}
					</Link>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{props.server.icon ? (
							<img
								src={`https://cdn.discordapp.com/icons/${props.server.discordId}/${props.server.icon}.webp?size=64`}
								alt={props.server.name}
								className="w-12 h-12 rounded-full"
							/>
						) : (
							<div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
								<ServerIcon server={props.server} size={48} />
							</div>
						)}
						<div>
							<h1 className="text-2xl font-bold">#{props.channel.name}</h1>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{props.server.name}
							</p>
						</div>
					</div>
					{!isIndexingEnabled && (
						<Button
							onClick={handleEnableIndexing}
							disabled={isEnabling}
							variant="default"
						>
							{isEnabling ? "Enabling..." : "Enable Indexing"}
						</Button>
					)}
				</div>
			</div>

			{/* Messages */}
			<div className="space-y-4">
				{messages.length === 0 ? (
					<div className="text-center text-gray-500 dark:text-gray-400 py-12">
						No messages in this channel yet
					</div>
				) : (
					messages.map((message) => {
						const author = authorMap.get(message.authorId);
						const messageDate = getSnowflakeDate(message.id);

						return (
							<div
								key={message.id}
								className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
							>
								<div className="flex items-start gap-3">
									{author ? (
										<Avatar className="w-10 h-10 flex-shrink-0">
											<AvatarImage
												src={getDiscordAvatarUrl(author.id, author.avatar)}
												alt={author.name}
											/>
											<AvatarFallback>
												{author.name.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									) : (
										<div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
											?
										</div>
									)}
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											{author ? (
												<Link
													href={`/u/${author.id}`}
													className="font-semibold text-gray-900 dark:text-gray-100 hover:underline"
												>
													{author.name}
												</Link>
											) : (
												<span className="font-semibold text-gray-500 dark:text-gray-400">
													Unknown user
												</span>
											)}
											<span className="text-xs text-gray-500 dark:text-gray-400">
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
