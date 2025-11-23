import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import { notFound, redirect } from "next/navigation";
import { MessagePage } from "./message-page";

const OtelLayer = createOtelLayer("main-site");

type Props = {
	params: Promise<{ messageId: string }>;
};

function getThreadIdOfMessage(message: {
	channelId: string;
	childThreadId?: string | null;
	parentChannelId?: string | null;
}): string | null {
	if (message.childThreadId) {
		return message.childThreadId;
	}
	if (message.parentChannelId) {
		return message.channelId;
	}
	return null;
}

export default async function Page(props: Props) {
	const params = await props.params;

	const message = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.messages.getMessageById({
			id: params.messageId,
		});
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!message) {
		return notFound();
	}

	const threadId = getThreadIdOfMessage(message);
	if (threadId && threadId !== params.messageId) {
		redirect(`/m/${threadId}`);
	}

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* Effect.scoped(
			database.messages.getMessagePageData({
				messageId: params.messageId,
			}),
		);
		return liveData;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!pageData) {
		return notFound();
	}

	return <MessagePage data={pageData} />;
}
