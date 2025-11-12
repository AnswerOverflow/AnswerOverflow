"use client";

import { convexQuery } from "@convex-dev/react-query";
import { api } from "@packages/database/convex/_generated/api";
import type { Id } from "@packages/database/convex/_generated/dataModel";
import type {
	Channel,
	DiscordAccount,
	Message,
	Server,
} from "@packages/database/convex/schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Button } from "@packages/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SearchResult = {
	message: Message;
	score: number;
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

export function SearchPageClient(props: {
	query?: string;
	results: SearchResult[];
}) {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState(props.query ?? "");

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	// Fetch live search results if query exists
	const { data: liveResults } = useQuery({
		...convexQuery(api.public.messages.searchMessages, {
			query: props.query ?? "",
			limit: 20,
		}),
		enabled: !!props.query && props.query.trim().length > 0,
	});

	const results = liveResults ?? props.results;

	// Get unique IDs for batch fetching
	const authorIds = useMemo(
		() => [...new Set(results.map((r: SearchResult) => r.message.authorId))],
		[results],
	);
	const serverIds = useMemo(
		() => [...new Set(results.map((r: SearchResult) => r.message.serverId))],
		[results],
	);
	const channelIds = useMemo(
		() => [...new Set(results.map((r: SearchResult) => r.message.channelId))],
		[results],
	);

	// Fetch authors, servers, and channels
	const { data: authors } = useQuery({
		...convexQuery(api.public.discord_accounts.findManyDiscordAccountsById, {
			ids: authorIds,
		}),
		enabled: authorIds.length > 0,
	});

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

	const authorMap = useMemo(
		() => new Map((authors ?? []).map((a: DiscordAccount) => [a.id, a])),
		[authors],
	);
	const serverMap = useMemo(
		() =>
			new Map(
				(servers ?? []).map((s: Server & { _id: Id<"servers"> }) => [s._id, s]),
			),
		[servers],
	);
	const channelMap = useMemo(
		() => new Map((channels ?? []).map((c: Channel) => [c.id, c])),
		[channels],
	);

	return (
		<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
			<div className="max-w-4xl mx-auto px-8 py-16">
				{/* Search Bar */}
				<form onSubmit={handleSearch} className="mb-8">
					<div className="flex gap-2">
						<input
							type="search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search Discord messages..."
							className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<Button type="submit">Search</Button>
					</div>
				</form>

				{/* Search Results */}
				{props.query ? (
					<div>
						<h2 className="text-2xl font-bold mb-4">
							Search results for &quot;{props.query}&quot;
						</h2>
						{results.length === 0 ? (
							<div className="text-center py-12">
								<p className="text-gray-600 dark:text-gray-400">
									No messages found matching your search.
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{results.map((result: SearchResult) => {
									const { message } = result;
									const author = authorMap.get(message.authorId);
									const server = serverMap.get(message.serverId);
									const channel = channelMap.get(message.channelId);
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
															src={getDiscordAvatarUrl(
																author.id,
																author.avatar,
															)}
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
													<div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
														{author && (
															<Link
																href={`/u/${author.id}`}
																className="font-semibold hover:underline"
															>
																{author.name}
															</Link>
														)}
														{server && (
															<>
																<span>in</span>
																<Link
																	href={`/c/${server.discordId}`}
																	className="hover:underline"
																>
																	{server.name}
																</Link>
															</>
														)}
														{channel && (
															<>
																<span>•</span>
																<Link
																	href={`/c/${server?.discordId ?? ""}/${channel.id}`}
																	className="hover:underline"
																>
																	#{channel.name}
																</Link>
															</>
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
								})}
							</div>
						)}
					</div>
				) : (
					<div className="text-center py-12">
						<h2 className="text-2xl font-bold mb-4">Search Discord Messages</h2>
						<p className="text-gray-600 dark:text-gray-400 mb-6">
							Enter a search query above to find messages across indexed Discord
							communities.
						</p>
						<div className="flex gap-4 justify-center">
							<Button asChild variant="outline">
								<Link href="/browse">Browse Communities</Link>
							</Button>
							<Button asChild variant="outline">
								<Link href="/">Back to Home</Link>
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
