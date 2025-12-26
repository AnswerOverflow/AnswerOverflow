import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { ChannelThreadCardSkeleton } from "@packages/ui/components/thread-card";
import { ChannelType } from "@packages/ui/utils/discord";
import {
	getTenantCanonicalUrl,
	type TenantInfo,
} from "@packages/ui/utils/links";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { runtime } from "../lib/runtime";
import {
	ChannelPageContent,
	MessagesList,
	ServerPageContent,
	ServerThreadsList,
	ThreadsList,
} from "./channel-page-content";

export type CommunityPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.public.channels.getCommunityPageHeaderData>
>;

export type ServerPageHeaderData = CommunityPageHeaderData & {
	selectedChannel: null;
};

export type ChannelPageHeaderData = CommunityPageHeaderData & {
	selectedChannel: NonNullable<CommunityPageHeaderData["selectedChannel"]>;
};

export type ChannelPageThreads = FunctionReturnType<
	typeof api.public.channels.getChannelPageThreads
>;

export type ChannelPageMessages = FunctionReturnType<
	typeof api.public.channels.getChannelPageMessages
>;

export type ServerPageThreads = FunctionReturnType<
	typeof api.public.channels.getServerPageThreads
>;

export async function fetchCommunityPageHeaderData(
	serverDiscordId: bigint,
	channelDiscordId?: bigint,
): Promise<CommunityPageHeaderData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.channels.getCommunityPageHeaderData({
			serverDiscordId,
			channelDiscordId,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchServerPageHeaderData(
	serverDiscordId: bigint,
): Promise<ServerPageHeaderData | null> {
	const data = await fetchCommunityPageHeaderData(serverDiscordId);
	if (!data) return null;
	return data as ServerPageHeaderData;
}

export async function fetchChannelPageHeaderData(
	serverDiscordId: bigint,
	channelDiscordId: bigint,
): Promise<ChannelPageHeaderData | null> {
	const data = await fetchCommunityPageHeaderData(
		serverDiscordId,
		channelDiscordId,
	);
	if (!data || !data.selectedChannel) return null;
	return data as ChannelPageHeaderData;
}

export async function fetchChannelPageThreads(
	channelDiscordId: bigint,
	cursor: string | null = null,
): Promise<ChannelPageThreads> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.channels.getChannelPageThreads({
			channelDiscordId,
			paginationOpts: { numItems: 20, cursor },
		});
	}).pipe(runtime.runPromise);
}

export async function fetchServerPageThreads(
	serverDiscordId: bigint,
	cursor: string | null = null,
): Promise<ServerPageThreads> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.channels.getServerPageThreads({
			serverDiscordId,
			paginationOpts: { numItems: 20, cursor },
		});
	}).pipe(runtime.runPromise);
}

export async function fetchChannelPageMessages(
	channelDiscordId: bigint,
	cursor: string | null = null,
): Promise<ChannelPageMessages> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.channels.getChannelPageMessages({
			channelDiscordId,
			paginationOpts: { numItems: 20, cursor },
		});
	}).pipe(runtime.runPromise);
}

export function generateServerPageMetadata(
	headerData: ServerPageHeaderData | null,
	basePath: string,
	tenant: TenantInfo | null = null,
): Metadata {
	if (!headerData) {
		return {};
	}

	const isTenant = tenant !== null;
	const { server } = headerData;
	const description =
		server.description ??
		`Explore the ${server.name} community Discord server on the web. Search and browse discussions, find answers, and join the conversation.`;
	const title = isTenant
		? `${server.name} Discord Server`
		: `${server.name} Discord Server | Answer Overflow`;
	const ogImage = isTenant
		? `/og/community?id=${server.discordId.toString()}&tenant=true`
		: `/og/community?id=${server.discordId.toString()}`;

	const canonicalUrl = getTenantCanonicalUrl(tenant, basePath);

	return {
		title,
		description,
		openGraph: {
			type: "website",
			siteName: isTenant ? server.name : "Answer Overflow",
			images: [ogImage],
			title,
			description,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImage],
		},
		alternates: {
			canonical: canonicalUrl,
		},
		robots: "index, follow",
	};
}

export function generateChannelPageMetadata(
	headerData: ChannelPageHeaderData | null,
	basePath: string,
	tenant: TenantInfo | null = null,
): Metadata {
	if (!headerData) {
		return {};
	}

	const isTenant = tenant !== null;
	const { server, selectedChannel } = headerData;
	const isAnnouncement =
		selectedChannel.type === ChannelType.GuildAnnouncement ||
		selectedChannel.type === ChannelType.GuildNews;
	const description = isAnnouncement
		? `Browse announcements from #${selectedChannel.name} in the ${server.name} community Discord server on the web.`
		: `Browse threads from #${selectedChannel.name} in the ${server.name} community Discord server on the web.`;
	const title = isTenant
		? `#${selectedChannel.name} - ${server.name} Discord`
		: `#${selectedChannel.name} - ${server.name} Discord | Answer Overflow`;
	const ogImage = isTenant
		? `/og/community?id=${server.discordId.toString()}&tenant=true`
		: `/og/community?id=${server.discordId.toString()}`;

	const canonicalUrl = getTenantCanonicalUrl(tenant, basePath);

	return {
		title,
		description,
		openGraph: {
			type: "website",
			siteName: isTenant ? server.name : "Answer Overflow",
			images: [ogImage],
			title,
			description,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImage],
		},
		alternates: {
			canonical: canonicalUrl,
		},
		robots: "noindex, follow",
	};
}

function ThreadsSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 5 }).map((_, i) => (
				<ChannelThreadCardSkeleton key={`skeleton-${i}`} />
			))}
		</div>
	);
}

async function ServerThreadsLoader(props: {
	serverDiscordId: bigint;
	cursor: string | null;
}) {
	const initialData = await fetchServerPageThreads(
		props.serverDiscordId,
		props.cursor,
	);

	return (
		<ServerThreadsList
			serverDiscordId={props.serverDiscordId}
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={props.cursor}
		/>
	);
}

async function ChannelThreadsLoader(props: {
	channelDiscordId: bigint;
	cursor: string | null;
}) {
	const initialData = await fetchChannelPageThreads(
		props.channelDiscordId,
		props.cursor,
	);

	return (
		<ThreadsList
			channelDiscordId={props.channelDiscordId}
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={props.cursor}
		/>
	);
}

async function ChannelMessagesLoader(props: {
	channelDiscordId: bigint;
	cursor: string | null;
}) {
	const initialData = await fetchChannelPageMessages(
		props.channelDiscordId,
		props.cursor,
	);

	return (
		<MessagesList
			channelDiscordId={props.channelDiscordId}
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={props.cursor}
		/>
	);
}

export async function ServerPageLoader(props: {
	headerData: ServerPageHeaderData | null;
	cursor?: string;
}) {
	const { headerData, cursor } = props;

	if (!headerData) {
		return notFound();
	}

	return (
		<ServerPageContent
			server={headerData.server}
			channels={headerData.channels}
		>
			<Suspense fallback={<ThreadsSkeleton />}>
				<ServerThreadsLoader
					serverDiscordId={headerData.server.discordId}
					cursor={cursor ?? null}
				/>
			</Suspense>
		</ServerPageContent>
	);
}

function isAnnouncementChannel(type: number): boolean {
	return (
		type === ChannelType.GuildAnnouncement || type === ChannelType.GuildNews
	);
}

export async function ChannelPageLoader(props: {
	headerData: ChannelPageHeaderData | null;
	cursor?: string;
}) {
	const { headerData, cursor } = props;

	if (!headerData) {
		return notFound();
	}

	const isAnnouncement = isAnnouncementChannel(headerData.selectedChannel.type);

	return (
		<ChannelPageContent
			server={headerData.server}
			channels={headerData.channels}
			selectedChannel={headerData.selectedChannel}
		>
			<Suspense fallback={<ThreadsSkeleton />}>
				{isAnnouncement ? (
					<ChannelMessagesLoader
						channelDiscordId={headerData.selectedChannel.id}
						cursor={cursor ?? null}
					/>
				) : (
					<ChannelThreadsLoader
						channelDiscordId={headerData.selectedChannel.id}
						cursor={cursor ?? null}
					/>
				)}
			</Suspense>
		</ChannelPageContent>
	);
}
