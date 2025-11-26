"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import {
	DiscordAvatar,
	type DiscordUser,
} from "@packages/ui/components/discord-avatar";
import { LinkButton } from "@packages/ui/components/link-button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import {
	ThreadCard,
	ThreadCardSkeletonList,
} from "@packages/ui/components/thread-card";
import { GiSpiderWeb } from "react-icons/gi";

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

function ServerSelect({
	server,
	userId,
	selected,
}: {
	server: ServerInfo;
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

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-row items-center justify-start gap-4 py-8">
			<GiSpiderWeb size={64} className="text-muted-foreground" />
			<span className="text-xl">{message}</span>
		</div>
	);
}

export function UserCommentsClient({
	userId,
	serverId,
	initialComments,
}: {
	userId: string;
	serverId?: string;
	initialComments: SearchResult[];
}) {
	if (initialComments.length === 0) {
		return <EmptyState message="No comments found" />;
	}

	return (
		<>
			{initialComments.map((result) => (
				<ThreadCard
					key={result.message.message.id.toString()}
					result={result}
				/>
			))}
			<ConvexInfiniteList
				query={api.public.search.getUserComments}
				queryArgs={{ userId, serverId }}
				pageSize={10}
				loader={<ThreadCardSkeletonList />}
				renderItem={(result) => (
					<ThreadCard
						key={result.message.message.id.toString()}
						result={result}
					/>
				)}
			/>
		</>
	);
}

export function UserCommentsPageClient({
	user,
	servers,
	comments,
	userId,
	serverId,
}: {
	user: DiscordUser;
	servers: ServerInfo[];
	comments: SearchResult[];
	userId: string;
	serverId?: string;
}) {
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

			<UserCommentsClient
				userId={userId}
				serverId={serverId}
				initialComments={comments}
			/>
		</div>
	);
}
