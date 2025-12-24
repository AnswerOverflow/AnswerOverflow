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
import {
	ThreadCard,
	ThreadCardSkeleton,
} from "@packages/ui/components/thread-card";
import { encodeCursor } from "@packages/ui/utils/cursor";
import type { FunctionReturnType } from "convex/server";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

export type ServerInfo = {
	id: string;
	name: string;
	icon?: string;
	discordId: bigint;
};

export function UserHeader({ user }: { user: DiscordUser }) {
	return (
		<div className="flex flex-row items-center gap-4">
			<DiscordAvatar user={user} size={64} />
			<span className="text-4xl font-semibold">{user.name}</span>
		</div>
	);
}

export function ServerSelect({
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

export function ServerFilter({
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

export function EmptyState({ message }: { message: string }) {
	return (
		<EmptyStateCard
			icon={Inbox}
			title={message}
			description=""
			className="min-h-0 py-8"
		/>
	);
}

export function UserPageLayout({
	user,
	servers,
	serverId,
	basePath,
	serverFilterLabel,
	children,
}: {
	user: DiscordUser;
	servers: ServerInfo[];
	serverId?: string;
	basePath: string;
	serverFilterLabel: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4">
			<UserHeader user={user} />
			<ServerFilter
				servers={servers}
				serverId={serverId}
				basePath={basePath}
				label={serverFilterLabel}
			/>
			{children}
		</div>
	);
}

export type UserPosts = FunctionReturnType<
	typeof api.public.discord_accounts.getUserPosts
>;

export function UserPostsList({
	userId,
	serverId,
	initialData,
	nextCursor,
	currentCursor,
	basePath,
}: {
	userId: bigint;
	serverId?: string;
	initialData?: UserPosts;
	nextCursor?: string | null;
	currentCursor?: string | null;
	basePath: string;
}) {
	const serverIdBigInt = serverId ? BigInt(serverId) : undefined;

	return (
		<>
			<ConvexInfiniteList
				query={api.public.discord_accounts.getUserPosts}
				queryArgs={{ userId, serverId: serverIdBigInt }}
				pageSize={20}
				initialLoaderCount={5}
				loader={<ThreadCardSkeleton />}
				initialData={initialData}
				emptyState={<EmptyState message="No posts found" />}
				renderItem={(result: SearchResult) => (
					<ThreadCard
						key={result.message.message.id.toString()}
						result={result}
					/>
				)}
			/>
			{nextCursor && (
				<a
					href={`${basePath}${serverId ? `?s=${serverId}&` : "?"}cursor=${encodeCursor(nextCursor)}`}
					className="sr-only"
					aria-hidden="true"
				>
					Next page
				</a>
			)}
		</>
	);
}
