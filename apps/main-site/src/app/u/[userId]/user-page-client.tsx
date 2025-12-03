"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import {
	EmptyState,
	InitialResults,
	type ServerInfo,
	UserPageLayout,
} from "./components";

function UserPostsContent({ initialPosts }: { initialPosts: SearchResult[] }) {
	if (initialPosts.length === 0) {
		return <EmptyState message="No posts found" />;
	}

	return <InitialResults results={initialPosts} />;
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
			<UserPostsContent initialPosts={posts} />
		</UserPageLayout>
	);
}
