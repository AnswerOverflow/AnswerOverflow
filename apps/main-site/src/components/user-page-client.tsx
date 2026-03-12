"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import {
	DiscordAvatar,
	type DiscordUser,
} from "@packages/ui/components/discord-avatar";
import { EmptyStateCard } from "@packages/ui/components/empty";
import { Link } from "@packages/ui/components/link";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { Skeleton } from "@packages/ui/components/skeleton";
import {
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { useQuery } from "convex/react";
import { Inbox } from "lucide-react";

type ServerInfo = {
	id: string;
	name: string;
	icon?: string;
	discordId: bigint;
};

function UserHeader({ user }: { user: DiscordUser }) {
	return (
		<div className="flex flex-row items-center gap-4">
			<DiscordAvatar user={user} size={64} />
			<span className="text-4xl font-semibold">{user.name}</span>
		</div>
	);
}

function UserHeaderSkeleton() {
	return (
		<div className="flex flex-row items-center gap-4">
			<Skeleton className="h-16 w-16 rounded-full" />
			<Skeleton className="h-10 w-48" />
		</div>
	);
}

function ServerSelect({
	server,
	selected,
	basePath,
}: {
	server: ServerInfo;
	selected: boolean;
	basePath: string;
}) {
	return (
		<Link
			href={selected ? basePath : `${basePath}?s=${server.id}`}
			className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 border ${
				selected
					? "bg-secondary text-secondary-foreground border-transparent shadow-sm hover:bg-secondary/80"
					: "border-input bg-background hover:bg-accent hover:text-accent-foreground"
			}`}
		>
			<ServerIcon server={server} size={24} />
			<span>{server.name}</span>
		</Link>
	);
}

function ServerFilter({
	servers,
	serverId,
	basePath,
	label,
}: {
	servers: ServerInfo[];
	serverId?: string;
	basePath: string;
	label: string;
}) {
	if (servers.length <= 1) {
		return null;
	}

	return (
		<>
			<span className="text-xl">{label}</span>
			<div className="flex flex-row flex-wrap items-center gap-2">
				{servers.map((server) => (
					<ServerSelect
						server={server}
						key={server.id}
						selected={server.id === serverId}
						basePath={basePath}
					/>
				))}
			</div>
		</>
	);
}

function EmptyState({ message }: { message: string }) {
	return (
		<EmptyStateCard
			icon={Inbox}
			title={message}
			description=""
			className="min-h-0 py-8"
		/>
	);
}

function UserPostsList({
	userId,
	serverId,
}: {
	userId: bigint;
	serverId?: bigint;
}) {
	return (
		<ConvexInfiniteList
			query={api.public.discord_accounts.getUserPosts}
			queryArgs={{ userId, serverId }}
			pageSize={20}
			initialLoaderCount={5}
			loader={<ThreadCardSkeleton />}
			emptyState={<EmptyState message="No posts found" />}
			renderItem={(result: SearchResult) => (
				<ThreadCard
					key={result.message.message.id.toString()}
					result={result}
				/>
			)}
		/>
	);
}

export function UserPageClient({
	userId,
	serverId,
	basePath,
	serverFilterLabel,
}: {
	userId: string;
	serverId?: string;
	basePath: string;
	serverFilterLabel: string;
}) {
	const userIdBigInt = BigInt(userId);
	const serverIdBigInt = serverId ? BigInt(serverId) : undefined;
	const headerData = useQuery(
		api.public.discord_accounts.getUserPageHeaderData,
		{ userId: userIdBigInt },
	);

	if (headerData === undefined) {
		return (
			<div className="flex flex-col gap-4">
				<UserHeaderSkeleton />
				<div className="space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<ThreadCardSkeleton key={`skeleton-${i}`} />
					))}
				</div>
			</div>
		);
	}

	if (headerData === null) {
		return <EmptyState message="User not found" />;
	}

	return (
		<div className="flex flex-col gap-4">
			<UserHeader user={headerData.user} />
			<ServerFilter
				servers={headerData.servers}
				serverId={serverId}
				basePath={basePath}
				label={serverFilterLabel}
			/>
			<UserPostsList userId={userIdBigInt} serverId={serverIdBigInt} />
		</div>
	);
}
