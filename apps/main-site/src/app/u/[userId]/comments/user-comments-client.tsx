"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import type { DiscordUser } from "@packages/ui/components/discord-avatar";
import { EmptyStateCard } from "@packages/ui/components/empty";
import { MessageSquare } from "lucide-react";
import { InitialResults, type ServerInfo, UserPageLayout } from "../components";

function UserCommentsContent({
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
			<UserCommentsContent initialComments={comments} />
		</UserPageLayout>
	);
}
