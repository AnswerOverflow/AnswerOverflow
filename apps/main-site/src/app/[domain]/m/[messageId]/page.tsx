import { Database } from "@packages/database/database";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
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
import { runtime } from "../../../../lib/runtime";

type Props = {
	params: Promise<{ domain: string; messageId: string }>;
	searchParams: Promise<{ cursor?: string; focus?: string }>;
};

async function getTenantData(domain: string) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		return tenant;
	}).pipe(runtime.runPromise);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const parsed = parseSnowflakeId(params.messageId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}`);
	}
	const domain = decodeURIComponent(params.domain);
	const tenantData = await getTenantData(domain);
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;
	const headerData = await fetchMessagePageHeaderData(parsed.value.id);
	const tenant = {
		customDomain: tenantData?.preferences?.customDomain,
		subpath: tenantData?.preferences?.subpath,
	};
	return generateMessagePageMetadata(
		headerData,
		params.messageId,
		cursor,
		tenant,
	);
}

async function RepliesLoader(props: {
	channelId: bigint;
	after: bigint;
	solutionMessageId: bigint | undefined;
	firstMessageAuthorId?: bigint;
	server?: MessagePageHeaderData["server"];
	channel?: MessagePageHeaderData["channel"];
	cursor: string | null;
}) {
	const initialData = await fetchMessagePageReplies({
		channelId: props.channelId,
		after: props.after,
		cursor: props.cursor,
	});

	return (
		<RepliesSection
			channelId={props.channelId}
			after={props.after}
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
	const parsed = parseSnowflakeId(params.messageId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}`);
	}
	const domain = decodeURIComponent(params.domain);
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;

	const [tenantData, headerData] = await Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.private.servers.getServerByDomain({
			domain,
		});
		const header = yield* database.private.messages.getMessagePageHeaderData({
			messageId: parsed.value.id,
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
	const queryChannelId = headerData.threadId ?? headerData.channelId;
	const afterMessageId =
		headerData.threadId ?? headerData.firstMessage?.message.id;

	return (
		<MessagePage
			headerData={headerData}
			repliesSlot={
				afterMessageId ? (
					<Suspense fallback={<RepliesSkeleton />}>
						<RepliesLoader
							channelId={queryChannelId}
							after={afterMessageId}
							solutionMessageId={solutionMessageId}
							firstMessageAuthorId={headerData.firstMessage?.author?.id}
							server={headerData.server}
							channel={headerData.channel}
							cursor={cursor}
						/>
					</Suspense>
				) : (
					<RepliesSkeleton />
				)
			}
			similarThreadsSlot={
				null
				// <Suspense fallback={<SimilarThreadsSkeleton />}>
				// 	<SimilarThreads
				// 		searchQuery={
				// 			headerData.thread?.name ??
				// 			headerData.firstMessage?.message.content?.slice(0, 100) ??
				// 			""
				// 		}
				// 		currentThreadId={(
				// 			headerData.thread?.id ??
				// 			headerData.firstMessage?.message.id ??
				// 			headerData.canonicalId
				// 		).toString()}
				// 		currentServerId={headerData.server.discordId.toString()}
				// 		serverId={headerData.server.discordId.toString()}
				// 	/>
				// </Suspense>
			}
		/>
	);
}
