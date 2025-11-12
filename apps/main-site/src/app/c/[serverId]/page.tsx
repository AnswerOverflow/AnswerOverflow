import type { Id } from "@packages/database/convex/_generated/dataModel";
import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/otel";
import { Effect, Layer } from "effect";
import { notFound } from "next/navigation";
import { ChannelPageClient } from "./client";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ serverId: string }>;
};

export default async function ServerPage(props: Props) {
	const params = await props.params;

	// Try to get server by Discord ID first, then by Convex ID
	const serverData = await Effect.gen(function* () {
		const database = yield* Database;

		// Try Discord ID first
		const serverByDiscordId = yield* Effect.scoped(
			database.servers.getServerByDiscordId(params.serverId),
		);

		if (serverByDiscordId?.data) {
			// Get server with channels
			const serverWithChannels = yield* Effect.scoped(
				database.servers.findServerByIdWithChannels(serverByDiscordId.data._id),
			);
			return serverWithChannels?.data;
		}

		// Try Convex ID
		try {
			const serverWithChannels = yield* Effect.scoped(
				database.servers.findServerByIdWithChannels(
					params.serverId as Id<"servers">,
				),
			);
			return serverWithChannels?.data;
		} catch {
			return null;
		}
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!serverData) {
		return notFound();
	}

	return (
		<ChannelPageClient server={serverData} channels={serverData.channels} />
	);
}
