"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import {
	ThreadCard,
	ThreadCardSkeletonList,
} from "@packages/ui/components/thread-card";
import { useTenant } from "@packages/ui/components/tenant-context";
import {
	EmptyState,
	InitialResults,
	type ServerInfo,
	UserPageLayout,
} from "../../../u/[userId]/components";

function TenantUserPostsContent({
	userId,
	serverId,
	initialPosts,
}: {
	userId: string;
	serverId: string;
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

export function TenantUserPageClient({
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
	serverId: string;
}) {
	const tenant = useTenant();
	const basePath = tenant?.subpath
		? `/${tenant.subpath}/u/${userId}`
		: `/u/${userId}`;

	return (
		<UserPageLayout
			user={user}
			servers={servers}
			userId={userId}
			serverId={serverId}
			basePath={basePath}
			serverFilterLabel="Explore posts from servers"
		>
			<TenantUserPostsContent
				userId={userId}
				serverId={serverId}
				initialPosts={posts}
			/>
		</UserPageLayout>
	);
}
