import { Database, DatabaseLayer } from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/effect-otel";
import { Effect, Layer } from "effect";
import type { Metadata } from "next";
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

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;

	const pageData = await Effect.gen(function* () {
		const database = yield* Database;
		const liveData = yield* Effect.scoped(
			database.private.messages.getMessagePageData({
				messageId: params.messageId,
			}),
		);
		return liveData;
	})
		.pipe(Effect.provide(Layer.mergeAll(DatabaseLayer, OtelLayer)))
		.pipe(Effect.runPromise);

	if (!pageData) {
		return {};
	}

	const firstMessage = pageData.messages.at(0);
	const title =
		pageData.thread?.name ??
		firstMessage?.message.content?.slice(0, 100) ??
		pageData.channel.name;
	const description =
		firstMessage?.message.content && firstMessage.message.content.length > 0
			? firstMessage.message.content
			: `Questions related to ${pageData.channel.name} in ${pageData.server.name}`;

	return {
		title: `${title} - ${pageData.server.name}`,
		description,
		openGraph: {
			images: [`/og/post?id=${params.messageId}`],
			title: `${title} - ${pageData.server.name}`,
			description,
		},
		alternates: {
			canonical: `/m/${pageData.thread?.id ?? params.messageId}`,
		},
	};
}

export default async function Page(props: Props) {
	const params = await props.params;

	const message = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.messages.getMessageById({
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
			database.private.messages.getMessagePageData({
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
