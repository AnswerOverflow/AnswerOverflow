import { Database } from "@packages/database/database";
import { Effect, Schema } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	MessagePage,
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
};

function parseBigInt(value: string) {
	return Schema.decodeUnknownOption(Schema.BigInt)(value);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const headerData = await fetchMessagePageHeaderData(parsed.value);
	return generateMessagePageMetadata(headerData, params.messageId);
}

async function RepliesLoader(props: {
	channelId: bigint;
	threadId: bigint | null;
	startingFromMessageId: bigint | undefined;
	firstMessageId: bigint | undefined;
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
			channelId={props.channelId}
			threadId={props.threadId}
			solutionMessageId={props.solutionMessageId}
		/>
	);
}

export default async function TenantMessagePage(props: Props) {
	const params = await props.params;
	const parsed = parseBigInt(params.messageId);
	if (parsed._tag === "None") {
		return notFound();
	}
	const domain = decodeURIComponent(params.domain);

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
						firstMessageId={headerData.firstMessage?.message.id}
						solutionMessageId={solutionMessageId}
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
