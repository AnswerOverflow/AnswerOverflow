import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/otel";
import { Effect, Layer } from "effect";
import { notFound } from "next/navigation";
import { ChannelPageClient } from "../client";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
};

export default async function ChannelPage(props: Props) {
	const params = await props.params;

	// Get server by Discord ID
	const serverData = await Effect.gen(function* () {
		const database = yield* Database;
		const serverLiveData = yield* Effect.scoped(
			database.servers.getServerByDiscordId(params.serverId),
		);
		return serverLiveData?.data;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!serverData) {
		return notFound();
	}

	// Get server with channels
	const serverWithChannels = await Effect.gen(function* () {
		const database = yield* Database;
		const serverWithChannelsData = yield* Effect.scoped(
			database.servers.findServerByIdWithChannels(serverData._id),
		);
		return serverWithChannelsData?.data;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!serverWithChannels) {
		return notFound();
	}

	// Get channel data
	const channelData = await Effect.gen(function* () {
		const database = yield* Database;

		// Get channel
		const channelLiveData = yield* Effect.scoped(
			database.channels.getChannelByDiscordId(params.channelId),
		);
		const channel = channelLiveData?.data;

		if (!channel || channel.serverId !== serverData._id) {
			return null;
		}

		// Get threads for this channel (forum posts)
		const threadsLiveData = yield* Effect.scoped(
			database.channels.publicFindAllThreadsByParentId(params.channelId),
		);
		let threads = threadsLiveData?.data ?? [];

		// Sort threads by creation time (newest threads first)
		// Use thread ID (snowflake) as a proxy for creation time since Discord snowflakes encode timestamp
		threads = threads.sort((a, b) => {
			// Higher snowflake ID = newer thread, so sort descending
			return b.id > a.id ? 1 : b.id < a.id ? -1 : 0;
		});

		// Limit to 50 newest threads after sorting
		threads = threads.slice(0, 50);

		// Get first message for each thread
		const threadMessages = yield* Effect.all(
			threads.map((thread) =>
				Effect.gen(function* () {
					const messageLiveData = yield* Effect.scoped(
						database.messages.findMessagesByChannelId(thread.id, {
							limit: 100, // Get more messages to ensure we find the first one
						}),
					);
					const messages = messageLiveData?.data ?? [];
					// Sort by message ID (snowflake) to get the chronologically first message
					const sortedMessages = messages.sort((a, b) => {
						// Compare as strings since snowflakes are strings
						// Lower ID = earlier message
						return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
					});
					return {
						thread,
						message: sortedMessages[0] ?? null,
					};
				}),
			),
		);

		return {
			channel,
			threads: threadMessages.filter(
				(
					tm,
				): tm is {
					thread: typeof tm.thread;
					message: NonNullable<typeof tm.message>;
				} => tm.message !== null,
			),
		};
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!channelData) {
		return notFound();
	}

	return (
		<ChannelPageClient
			server={serverData}
			channels={serverWithChannels.channels}
			selectedChannel={channelData.channel}
			threads={channelData.threads}
		/>
	);
}
