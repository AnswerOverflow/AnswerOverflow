"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import {
	ThreadCard,
	ThreadCardSkeletonList,
} from "@packages/ui/components/thread-card";
import {
	EmptyState,
	InitialResults,
	type ServerInfo,
	UserPageLayout,
} from "./components";

function UserPostsContent({
	userId,
	serverId,
	initialPosts,
}: {
	userId: string;
	serverId?: string;
	initialPosts: SearchResult[];
}) {
	if (initialPosts.length === 0) {
		return <EmptyState message="No posts found" />;
	}

	return (
		<>
			<InitialResults results={initialPosts} />
			<ConvexInfiniteList
				query={api.public.search.getUserPosts}
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

export function UserPageClient({
	user,
	servers,
	posts,
	userId,
	serverId,
}: {
	user: DiscordUser;
	servers: ServerInfo[];
	posts: SearchResult[];
	userId: string;
	serverId?: string;
}) {
	return (
		<UserPageLayout
			user={user}
			servers={servers}
			userId={userId}
			serverId={serverId}
			basePath={`/u/${userId}`}
			serverFilterLabel="Explore posts from servers"
		>
			<UserPostsContent
				userId={userId}
				serverId={serverId}
				initialPosts={posts}
			/>
		</UserPageLayout>
	);
}
