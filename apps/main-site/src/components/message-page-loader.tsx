import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { runtime } from "../lib/runtime";
import { MessagePage, RepliesSection, RepliesSkeleton } from "./message-page";

export type MessagePageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.messages.getMessagePageHeaderData>
>;

export type MessagePageReplies = FunctionReturnType<
	typeof api.private.messages.getMessagePageReplies
>;

export async function fetchMessagePageHeaderData(
	messageId: bigint,
): Promise<MessagePageHeaderData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.messages.getMessagePageHeaderData({
			messageId,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchMessagePageReplies(
	channelId: bigint,
	threadId: bigint | null,
	startingFromMessageId: bigint | undefined,
): Promise<MessagePageReplies> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.private.messages.getMessagePageReplies({
			channelId,
			threadId: threadId ?? undefined,
			startingFromMessageId,
		});
	}).pipe(runtime.runPromise);
}

export function generateMessagePageMetadata(
	headerData: MessagePageHeaderData | null,
	messageId: string,
): Metadata {
	if (!headerData) {
		return {};
	}

	const { firstMessage } = headerData;
	const rootMessageDeleted = headerData.rootMessageDeleted && !firstMessage;
	const title =
		headerData.thread?.name ??
		firstMessage?.message.content?.slice(0, 100) ??
		headerData.channel.name;
	const description = rootMessageDeleted
		? `Discussion in ${headerData.thread?.name ?? headerData.channel.name} - ${headerData.server.name}`
		: firstMessage?.message.content && firstMessage.message.content.length > 0
			? firstMessage.message.content
			: `Questions related to ${headerData.channel.name} in ${headerData.server.name}`;

	return {
		title: `${title} - ${headerData.server.name}`,
		description,
		openGraph: {
			images: [`/og/post?id=${messageId}`],
			title: `${title} - ${headerData.server.name}`,
			description,
		},
		alternates: {
			canonical: `/m/${headerData.canonicalId.toString()}`,
		},
	};
}

async function RepliesLoader(props: {
	channelId: bigint;
	threadId: bigint | null;
	startingFromMessageId: bigint | undefined;
	firstMessageId: bigint | undefined;
	serverDiscordId: bigint;
	channelDiscordId: bigint;
	solutionMessageId: bigint | undefined;
}) {
	const replies = await fetchMessagePageReplies(
		props.channelId,
		props.threadId,
		props.startingFromMessageId,
	);

	return (
		<RepliesSection
			replies={replies}
			firstMessageId={props.firstMessageId}
			channelId={props.channelDiscordId}
			threadId={props.threadId}
			solutionMessageId={props.solutionMessageId}
		/>
	);
}

export function MessagePageLoader(props: {
	headerData: MessagePageHeaderData | null;
	messageId: string;
}) {
	const { headerData, messageId } = props;

	if (!headerData) {
		return notFound();
	}

	const hasFirstMessage = headerData.firstMessage !== null;
	const hasThread = headerData.thread !== null;
	const rootMessageDeleted = headerData.rootMessageDeleted;

	if (!hasFirstMessage && !rootMessageDeleted) {
		return notFound();
	}

	if (rootMessageDeleted && !hasThread) {
		return notFound();
	}

	const canonicalId = headerData.canonicalId.toString();
	if (canonicalId !== messageId) {
		redirect(`/m/${canonicalId}?focus=${messageId}`);
	}

	const solutionMessageId = headerData.solutionMessage?.message.id;
	const startingFromMessageId =
		headerData.threadId || rootMessageDeleted
			? undefined
			: headerData.firstMessage?.message.id;

	return (
		<MessagePage
			headerData={headerData}
			repliesSlot={
				<Suspense fallback={<RepliesSkeleton />}>
					<RepliesLoader
						channelId={headerData.channelId}
						threadId={headerData.threadId}
						startingFromMessageId={startingFromMessageId}
						firstMessageId={headerData.firstMessage?.message.id}
						serverDiscordId={headerData.server.discordId}
						channelDiscordId={headerData.channel.id}
						solutionMessageId={solutionMessageId}
					/>
				</Suspense>
			}
		/>
	);
}
