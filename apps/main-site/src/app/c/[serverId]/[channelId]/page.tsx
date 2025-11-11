import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/otel";
import { Effect, Layer } from "effect";
import { notFound } from "next/navigation";
import { ChannelPageClient } from "./client";

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

		// Get messages (limit to 50 for initial load)
		const messagesLiveData = yield* Effect.scoped(
			database.messages.findMessagesByChannelId(params.channelId, {
				limit: 50,
			}),
		);
		const messages = messagesLiveData?.data ?? [];

		return {
			channel,
			messages,
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
			channel={channelData.channel}
			messages={channelData.messages}
		/>
	);
}
