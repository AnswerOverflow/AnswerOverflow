import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { notFound } from "next/navigation";
import { ChannelPageContent } from "../../../../components/channel-page-content";
import { runtime } from "../../../../lib/runtime";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ serverId: string; channelId: string }>;
};

export default async function ChannelPage(props: Props) {
	const params = await props.params;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* database.private.channels.getChannelPageData({
			serverDiscordId: params.serverId,
			channelDiscordId: params.channelId,
		});
		return liveData;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(runtime.runPromise);

	if (!pageData) {
		return notFound();
	}

	return (
		<ChannelPageContent
			server={pageData.server}
			channels={pageData.channels}
			selectedChannel={pageData.selectedChannel}
			threads={pageData.threads}
		/>
	);
}
