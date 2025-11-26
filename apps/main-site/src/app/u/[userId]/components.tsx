"use client";

import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import {
	DiscordAvatar,
	type DiscordUser,
} from "@packages/ui/components/discord-avatar";
import { LinkButton } from "@packages/ui/components/link-button";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { ThreadCard } from "@packages/ui/components/thread-card";
import type { ReactNode } from "react";
import { GiSpiderWeb } from "react-icons/gi";

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
		<LinkButton
			href={selected ? basePath : `${basePath}?s=${server.id}`}
			variant={selected ? "secondary" : "outline"}
			className="gap-2"
		>
			<ServerIcon server={server} size={24} />
			<span>{server.name}</span>
		</LinkButton>
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

export function UserTabs({ userId }: { userId: string }) {
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

export function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-row items-center justify-start gap-4 py-8">
			<GiSpiderWeb size={64} className="text-muted-foreground" />
			<span className="text-xl">{message}</span>
		</div>
	);
}

export function UserPageLayout({
	user,
	servers,
	userId,
	serverId,
	basePath,
	serverFilterLabel,
	children,
}: {
	user: DiscordUser;
	servers: ServerInfo[];
	userId: string;
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
			<UserTabs userId={userId} />
			{children}
		</div>
	);
}

export function InitialResults({ results }: { results: SearchResult[] }) {
	return (
		<>
			{results.map((result) => (
				<ThreadCard
					key={result.message.message.id.toString()}
					result={result}
				/>
			))}
		</>
	);
}
