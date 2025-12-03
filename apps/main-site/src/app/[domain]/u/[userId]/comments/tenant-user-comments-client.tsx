"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import { EmptyStateCard } from "@packages/ui/components/empty";
import { useTenant } from "@packages/ui/components/tenant-context";
import { MessageSquare } from "lucide-react";
import {
	InitialResults,
	type ServerInfo,
	UserPageLayout,
} from "../../../../u/[userId]/components";

function TenantUserCommentsContent({
	initialComments,
}: {
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

	return <InitialResults results={initialComments} />;
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
			<TenantUserCommentsContent initialComments={comments} />
		</UserPageLayout>
	);
}
