"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import { ThreadCardSkeletonList } from "@packages/ui/components/thread-card";
import {
	EmptyState,
	InitialResults,
	type ServerInfo,
	UserPageLayout,
} from "../components";

function UserCommentsContent({
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
			<InitialResults results={initialComments} />
			<ConvexInfiniteList
				query={api.public.search.getUserComments}
				queryArgs={{ userId, serverId }}
				pageSize={10}
				loader={<ThreadCardSkeletonList />}
				renderItem={(result) => <InitialResults results={[result]} />}
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
		<UserPageLayout
			user={user}
			servers={servers}
			userId={userId}
			serverId={serverId}
			basePath={`/u/${userId}/comments`}
			serverFilterLabel="Explore comments from servers"
		>
			<UserCommentsContent
				userId={userId}
				serverId={serverId}
				initialComments={comments}
			/>
		</UserPageLayout>
	);
}
