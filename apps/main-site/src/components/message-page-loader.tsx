import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { runtime } from "../lib/runtime";
import { MessagePage } from "./message-page";

export type MessagePageData = NonNullable<
	FunctionReturnType<typeof api.private.messages.getMessagePageData>
>;

export async function fetchMessagePageData(
	messageId: bigint,
): Promise<MessagePageData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.messages.getMessagePageData({
			messageId,
		});
	}).pipe(runtime.runPromise);
}

export function generateMessagePageMetadata(
	pageData: MessagePageData | null,
	messageId: string,
): Metadata {
	if (!pageData) {
		return {};
	}

	const firstMessage = pageData.messages.at(0);
	const rootMessageDeleted = pageData.rootMessageDeleted && !firstMessage;
	const title =
		pageData.thread?.name ??
		firstMessage?.message.content?.slice(0, 100) ??
		pageData.channel.name;
	const description = rootMessageDeleted
		? `Discussion in ${pageData.thread?.name ?? pageData.channel.name} - ${pageData.server.name}`
		: firstMessage?.message.content && firstMessage.message.content.length > 0
			? firstMessage.message.content
			: `Questions related to ${pageData.channel.name} in ${pageData.server.name}`;

	return {
		title: `${title} - ${pageData.server.name}`,
		description,
		openGraph: {
			images: [`/og/post?id=${messageId}`],
			title: `${title} - ${pageData.server.name}`,
			description,
		},
		alternates: {
			canonical: `/m/${pageData.canonicalId.toString()}`,
		},
	};
}

export function MessagePageLoader(props: {
	pageData: MessagePageData | null;
	messageId: string;
}) {
	const { pageData, messageId } = props;

	if (!pageData) {
		return notFound();
	}

	const hasMessages = pageData.messages.length > 0;
	const hasThread = pageData.thread !== null;
	const rootMessageDeleted = pageData.rootMessageDeleted;

	if (!hasMessages && !rootMessageDeleted) {
		return notFound();
	}

	if (rootMessageDeleted && !hasThread) {
		return notFound();
	}

	const canonicalId = pageData.canonicalId.toString();
	if (canonicalId !== messageId) {
		redirect(`/m/${canonicalId}?focus=${messageId}`);
	}

	return <MessagePage data={pageData} />;
}
