import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import { ThreadCardSkeletonList } from "@packages/ui/components/thread-card";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { runtime } from "../lib/runtime";
import { ChannelPageContent, ThreadsList } from "./channel-page-content";

export type ChannelPageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.channels.getChannelPageHeaderData>
>;

export type ChannelPageThreads = FunctionReturnType<
	typeof api.private.channels.getChannelPageThreads
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
): Promise<ChannelPageThreads> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.channels.getChannelPageThreads({
			channelDiscordId,
		});
	}).pipe(runtime.runPromise);
}

async function ThreadsLoader(props: { channelDiscordId: bigint }) {
	const threads = await fetchChannelPageThreads(props.channelDiscordId);
	return <ThreadsList threads={threads} />;
}

export function ThreadsSkeleton() {
	return <ThreadCardSkeletonList count={5} />;
}

export function ChannelPageLoader(props: {
	headerData: ChannelPageHeaderData | null;
}) {
	const { headerData } = props;

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
					<ThreadsLoader channelDiscordId={headerData.selectedChannel.id} />
				</Suspense>
			}
		/>
	);
}
