import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { Effect, Schema } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	MessagePage,
	type MessagePageHeaderData,
	RepliesSection,
	RepliesSkeleton,
} from "../../../../components/message-page";
import {
	fetchMessagePageHeaderData,
	fetchMessagePageReplies,
	generateMessagePageMetadata,
} from "../../../../components/message-page-loader";
import {
	SimilarThreads,
	SimilarThreadsSkeleton,
} from "../../../../components/similar-threads";
import { runtime } from "../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string; messageId: string }>;
	searchParams: Promise<{ cursor?: string; focus?: string }>;
};

function parseBigInt(value: string) {
	return Schema.decodeUnknownOption(Schema.BigInt)(value);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;
	const headerData = await fetchMessagePageHeaderData(parsed.value);
	return generateMessagePageMetadata(headerData, params.messageId, cursor);
}

async function RepliesLoader(props: {
	channelId: bigint;
	threadId: bigint | null;
	startingFromMessageId: bigint | undefined;
	solutionMessageId: bigint | undefined;
	firstMessageAuthorId?: bigint;
	server?: MessagePageHeaderData["server"];
	channel?: MessagePageHeaderData["channel"];
	cursor: string | null;
}) {
	const initialData = await fetchMessagePageReplies(
		props.channelId,
		props.threadId,
		props.startingFromMessageId,
		props.cursor,
	);

	return (
		<RepliesSection
			channelId={props.channelId}
			threadId={props.threadId}
			startingFromMessageId={props.startingFromMessageId}
			solutionMessageId={props.solutionMessageId}
			firstMessageAuthorId={props.firstMessageAuthorId}
			server={props.server}
			channel={props.channel}
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={props.cursor}
		/>
	);
}

export default async function TenantMessagePage(props: Props) {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const domain = decodeURIComponent(params.domain);
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;

	const [tenantData, headerData] = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		const header = yield* database.private.messages.getMessagePageHeaderData({
			messageId: parsed.value,
		});
		return [tenant, header] as const;
	}).pipe(runtime.runPromise);

	if (!tenantData?.server || !headerData) {
		return notFound();
	}

	if (headerData.server.discordId !== tenantData.server.discordId) {
		return notFound();
	}

	const canonicalId = headerData.canonicalId.toString();
	if (canonicalId !== params.messageId) {
		redirect(`/m/${canonicalId}?focus=${params.messageId}`);
	}

	const solutionMessageId = headerData.solutionMessage?.message.id;
	const startingFromMessageId =
		headerData.threadId || headerData.firstMessage === null
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
						solutionMessageId={solutionMessageId}
						firstMessageAuthorId={headerData.firstMessage?.author?.id}
						server={headerData.server}
						channel={headerData.channel}
						cursor={cursor}
					/>
				</Suspense>
			}
			similarThreadsSlot={
				<Suspense fallback={<SimilarThreadsSkeleton />}>
					<SimilarThreads
						searchQuery={
							headerData.thread?.name ??
							headerData.firstMessage?.message.content?.slice(0, 100) ??
							""
						}
						currentThreadId={(
							headerData.thread?.id ??
							headerData.firstMessage?.message.id ??
							headerData.canonicalId
						).toString()}
						currentServerId={headerData.server.discordId.toString()}
						serverId={headerData.server.discordId.toString()}
					/>
				</Suspense>
			}
		/>
	);
}
