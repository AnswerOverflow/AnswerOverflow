"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import { useTenant } from "@packages/ui/components/tenant-context";
import {
	EmptyState,
	InitialResults,
	type ServerInfo,
	UserPageLayout,
} from "../../../u/[userId]/components";

function TenantUserPostsContent({
	initialPosts,
}: {
	initialPosts: SearchResult[];
}) {
	if (initialPosts.length === 0) {
		return <EmptyState message="No posts found" />;
	}

	return <InitialResults results={initialPosts} />;
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
			<TenantUserPostsContent initialPosts={posts} />
		</UserPageLayout>
	);
}
