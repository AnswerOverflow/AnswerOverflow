"use client";

import { api } from "@packages/database/convex/_generated/api";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import { EmptyStateCard } from "@packages/ui/components/empty";
import {
	ThreadCard,
	ThreadCardSkeletonList,
} from "@packages/ui/components/thread-card";
import { useTenant } from "@packages/ui/components/tenant-context";
import { MessageSquare } from "lucide-react";
import {
	InitialResults,
	type ServerInfo,
	UserPageLayout,
} from "../../../../u/[userId]/components";

function TenantUserCommentsContent({
	userId,
	serverId,
	initialComments,
}: {
	userId: string;
	serverId: string;
	initialComments: SearchResult[];
}) {
	if (initialComments.length === 0) {
		return (
			<EmptyStateCard
				icon={MessageSquare}
				title="No comments found"
				description="This user hasn't made any comments yet."
			/>
		);
	}

	return (
		<>
			<InitialResults results={initialComments} />
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

export function TenantUserCommentsPageClient({
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
	serverId: string;
}) {
	const tenant = useTenant();
	const basePath = tenant?.subpath
		? `/${tenant.subpath}/u/${userId}/comments`
		: `/u/${userId}/comments`;

	return (
		<UserPageLayout
			user={user}
			servers={servers}
			userId={userId}
			serverId={serverId}
			basePath={basePath}
			serverFilterLabel="Explore comments from servers"
		>
			<TenantUserCommentsContent
				userId={userId}
				serverId={serverId}
				initialComments={comments}
			/>
		</UserPageLayout>
	);
}
