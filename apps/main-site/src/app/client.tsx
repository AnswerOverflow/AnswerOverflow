"use client";

import { api } from "@packages/database/convex/_generated/api";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import { DiscordMessage } from "@packages/ui/components/discord-message";
import { ThreadIcon } from "@packages/ui/components/discord-message/mention";
import { Link } from "@packages/ui/components/link";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useConvexAuth } from "convex/react";
import { Hash, MessageSquare } from "lucide-react";

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare;
	return Hash;
}

export function HomePageClient() {
	const auth = useConvexAuth();

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Recent Threads
					</h1>
					<p className="text-muted-foreground">
						Live feed of Discord threads as they come in
					</p>
				</div>

				{auth.isAuthenticated ? (
					<ConvexInfiniteList
						query={api.public.search.getRecentThreads}
						queryArgs={{}}
						pageSize={20}
						renderItem={(threadData) => {
							if (!threadData.thread) return null;

							const ChannelIcon = threadData.channel
								? getChannelIcon(threadData.channel.type)
								: Hash;

							return (
								<div
									key={threadData.thread.id}
									className="rounded-lg border border-border bg-card overflow-hidden mb-4"
								>
									<div className="px-4 py-3 border-b border-border bg-muted/30">
										<div className="flex items-center gap-2 flex-wrap text-sm">
											{threadData.server && (
												<>
													<div className="flex items-center gap-1.5">
														<ServerIcon
															server={threadData.server}
															size={16}
															className="shrink-0"
														/>
														<Link
															href={`/c/${threadData.server.discordId}`}
															className="font-semibold text-foreground hover:underline"
															onClick={(e) => e.stopPropagation()}
														>
															{threadData.server.name}
														</Link>
													</div>
													<span className="text-muted-foreground">•</span>
												</>
											)}
											{threadData.channel && (
												<>
													<div className="flex items-center gap-1.5">
														<ChannelIcon className="size-4 text-muted-foreground shrink-0" />
														<span className="text-muted-foreground">
															{threadData.channel.name}
														</span>
													</div>
													<span className="text-muted-foreground">•</span>
												</>
											)}
											<div className="flex items-center gap-1.5">
												<ThreadIcon className="size-4 text-muted-foreground shrink-0" />
												<span className="text-muted-foreground">
													{threadData.thread.name ||
														threadData.message.message.content
															?.slice(0, 30)
															.trim() ||
														"Untitled thread"}
												</span>
											</div>
										</div>
									</div>
									<Link
										href={`/m/${threadData.message.message.id}`}
										className="block hover:bg-accent/50 transition-colors"
									>
										<div className="p-4">
											<DiscordMessage enrichedMessage={threadData.message} />
										</div>
									</Link>
								</div>
							);
						}}
						loader={
							<div className="space-y-4">
								{Array.from({ length: 3 }).map((_, i) => (
									<div
										key={`skeleton-${i}`}
										className="rounded-lg border border-border bg-card p-5"
									>
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
								))}
							</div>
						}
					/>
				) : (
					<div className="rounded-lg border border-border bg-card p-8 text-center">
						<p className="text-muted-foreground">
							Please sign in to view recent threads.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
