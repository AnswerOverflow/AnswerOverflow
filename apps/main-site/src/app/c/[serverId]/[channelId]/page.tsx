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

	const pageRender = Effect.gen(function* () {
		const database = yield* Database;

		// Get all page data in one query
		const pageData = yield* Effect.scoped(
			database.channels.getChannelPageData(params.serverId, params.channelId),
		);

		if (!pageData?.data) {
			return null;
		}

		return {
			server: pageData.data.server,
			channels: pageData.data.channels,
			selectedChannel: pageData.data.selectedChannel,
			threads: pageData.data.threads,
		};
	})
		.pipe(
			Effect.withSpan("channel_page_render", {
				attributes: {
					serverId: params.serverId,
					channelId: params.channelId,
				},
			}),
		)
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	const pageRenderResult = await pageRender;

	if (!pageRenderResult) {
		return notFound();
	}

	return (
		<ChannelPageClient
			server={pageRenderResult.server}
			channels={pageRenderResult.channels}
			selectedChannel={pageRenderResult.selectedChannel}
			threads={pageRenderResult.threads}
		/>
	);
}
