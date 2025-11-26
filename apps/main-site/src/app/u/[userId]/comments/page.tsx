"use client";

import { api } from "@packages/database/convex/_generated/api";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import {
	DiscordAvatar,
	type DiscordUser,
} from "@packages/ui/components/discord-avatar";
import { DiscordMessage } from "@packages/ui/components/discord-message";
import { ThreadIcon } from "@packages/ui/components/discord-message/mention";
import { Link } from "@packages/ui/components/link";
import { LinkButton } from "@packages/ui/components/link-button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Skeleton } from "@packages/ui/components/skeleton";
import { useConvexAuth, useQuery } from "convex/react";
import { Hash, MessageSquare } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { GiSpiderWeb } from "react-icons/gi";

function getChannelIcon(type: number) {
	if (type === 15) return MessageSquare;
	return Hash;
}

function UserHeader({ user }: { user: DiscordUser }) {
	return (
		<div className="flex flex-row items-center gap-4">
			<DiscordAvatar user={user} size={64} />
			<span className="text-4xl font-semibold">{user.name}</span>
		</div>
	);
}

function ServerSelect({
	server,
	userId,
	selected,
}: {
	server: { id: string; name: string; icon?: string; discordId: bigint };
	userId: string;
	selected: boolean;
}) {
	return (
		<LinkButton
			href={
				selected
					? `/u/${userId}/comments`
					: `/u/${userId}/comments?s=${server.id}`
			}
			variant={selected ? "secondary" : "outline"}
			className="gap-2"
		>
			<ServerIcon server={server} size={24} />
			<span>{server.name}</span>
		</LinkButton>
	);
}

function UserTabs({ userId }: { userId: string }) {
	return (
		<div className="flex flex-row gap-4">
			<LinkButton
				variant="outline"
				selectedVariant="secondary"
				href={`/u/${userId}`}
			>
				Posts
			</LinkButton>
			<LinkButton
				variant="outline"
				selectedVariant="secondary"
				href={`/u/${userId}/comments`}
			>
				Comments
			</LinkButton>
		</div>
	);
}

function UserCommentsList({
	userId,
	serverId,
}: {
	userId: string;
	serverId?: string;
}) {
	return (
		<ConvexInfiniteList
			query={api.public.search.getUserComments}
			queryArgs={{ userId, serverId }}
			pageSize={10}
			loader={<CommentsSkeleton />}
			renderItem={(result) => {
				const ChannelIcon = result.channel
					? getChannelIcon(result.channel.type)
					: Hash;

				return (
					<div
						key={result.message.message.id}
						className="rounded-lg border border-border bg-card overflow-hidden mb-4"
					>
						<div className="px-4 py-3 border-b border-border bg-muted/30">
							<div className="flex items-center gap-2 flex-wrap text-sm">
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
												onClick={(e) => e.stopPropagation()}
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
											<span className="text-muted-foreground">
												{result.channel.name}
											</span>
										</div>
										<span className="text-muted-foreground">•</span>
									</>
								)}
								{result.thread && (
									<div className="flex items-center gap-1.5">
										<ThreadIcon className="size-4 text-muted-foreground shrink-0" />
										<span className="text-muted-foreground">
											{result.thread.name ||
												result.message.message.content?.slice(0, 30).trim() ||
												"Untitled thread"}
										</span>
									</div>
								)}
							</div>
						</div>
						<Link
							href={`/m/${result.message.message.id}`}
							className="block hover:bg-accent/50 transition-colors"
						>
							<div className="p-4">
								<DiscordMessage enrichedMessage={result.message} />
							</div>
						</Link>
					</div>
				);
			}}
		/>
	);
}

function CommentsSkeleton() {
	return (
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
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-row items-center justify-start gap-4 py-8">
			<GiSpiderWeb size={64} className="text-muted-foreground" />
			<span className="text-xl">{message}</span>
		</div>
	);
}

export default function UserCommentsPage() {
	const params = useParams<{ userId: string }>();
	const searchParams = useSearchParams();
	const auth = useConvexAuth();

	const userId = params.userId;
	const serverId = searchParams.get("s") ?? undefined;

	const user = useQuery(
		api.public.search.getUserById,
		auth.isAuthenticated ? { userId } : "skip",
	);

	const servers = useQuery(
		api.public.search.getServersUserHasPostedIn,
		auth.isAuthenticated ? { userId } : "skip",
	);

	if (!auth.isAuthenticated) {
		return (
			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground">
					Please sign in to view user profiles.
				</p>
			</div>
		);
	}

	if (user === undefined || servers === undefined) {
		return (
			<div className="flex flex-col gap-4">
				<div className="flex flex-row items-center gap-4">
					<Skeleton className="size-16 rounded-full" />
					<Skeleton className="h-10 w-48" />
				</div>
				<CommentsSkeleton />
			</div>
		);
	}

	if (user === null) {
		return <EmptyState message="User not found" />;
	}

	return (
		<div className="flex flex-col gap-4">
			<UserHeader user={user} />

			{servers.length > 1 && (
				<>
					<span className="text-xl">Explore comments from servers</span>
					<div className="flex flex-row flex-wrap items-center gap-2">
						{servers.map((server) => (
							<ServerSelect
								server={server}
								key={server.id}
								userId={userId}
								selected={server.id === serverId}
							/>
						))}
					</div>
				</>
			)}

			<UserTabs userId={userId} />

			<UserCommentsList userId={userId} serverId={serverId} />
		</div>
	);
}
