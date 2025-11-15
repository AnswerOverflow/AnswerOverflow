import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { notFound } from "next/navigation";
import { MessagePageClient } from "./client";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ messageId: string }>;
};

export default async function MessagePage(props: Props) {
	const params = await props.params;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* Effect.scoped(
			database.messages.getMessagePageData({ messageId: params.messageId }),
		);
		return liveData;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!pageData) {
		return notFound();
	}

	return <MessagePageClient data={pageData} />;
}
