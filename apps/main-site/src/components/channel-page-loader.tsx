import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { ChannelThreadCardSkeleton } from "@packages/ui/components/thread-card";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { runtime } from "../lib/runtime";
import { ChannelPageContent, ThreadsList } from "./channel-page-content";

export type ChannelPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getChannelPageHeaderData>
>;

export type ChannelPageThreads = FunctionReturnType<
	typeof api.public.channels.getChannelPageThreads
>;

export async function fetchChannelPageHeaderData(
	serverDiscordId: bigint,
	channelDiscordId: bigint,
): Promise<ChannelPageHeaderData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.channels.getChannelPageHeaderData({
			serverDiscordId,
			channelDiscordId,
		});
	}).pipe(runtime.runPromise);
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

export function generateChannelPageMetadata(
	headerData: ChannelPageHeaderData | null,
	basePath: string,
	cursor: string | null,
): Metadata {
	if (!headerData) {
		return {};
	}

	const { server, selectedChannel } = headerData;
	const description = `Browse threads from #${selectedChannel.name} in the ${server.name} Discord community`;

	return {
		title: `#${selectedChannel.name} - ${server.name}`,
		description,
		openGraph: {
			images: [`/og/community?id=${server.discordId.toString()}`],
			title: `#${selectedChannel.name} - ${server.name}`,
			description,
		},
		alternates: {
			canonical: basePath,
		},
		robots: cursor ? "noindex, follow" : "index, follow",
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

async function ThreadsLoader(props: {
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

export function ChannelPageLoader(props: {
	headerData: ChannelPageHeaderData | null;
	cursor?: string;
}) {
	const { headerData, cursor } = props;

	if (!headerData) {
		return notFound();
	}

	return (
		<ChannelPageContent
			server={headerData.server}
			channels={headerData.channels}
			selectedChannel={headerData.selectedChannel}
			threadsSlot={
				<Suspense fallback={<ThreadsSkeleton />}>
					<ThreadsLoader
						channelDiscordId={headerData.selectedChannel.id}
						cursor={cursor ?? null}
					/>
				</Suspense>
			}
		/>
	);
}
