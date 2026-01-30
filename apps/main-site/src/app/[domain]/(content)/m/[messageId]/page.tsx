import { Database } from "@packages/database/database";
import type { EnrichedMessage } from "@packages/ui/components/discord-message";
import { decodeCursor } from "@packages/ui/utils/cursor";
import { parseSnowflakeId } from "@packages/ui/utils/snowflake";
import { Effect, Option } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
	MessagePage,
	type MessagePageHeaderData,
	RepliesSection,
	RepliesSkeleton,
} from "../../../../../components/message-page";
import {
	fetchMessagePageHeaderData,
	fetchMessagePageReplies,
	generateMessagePageMetadata,
	MessagePageSkeleton,
} from "../../../../../components/message-page-loader";
import {
	RecentAnnouncements,
	RecentAnnouncementsSkeleton,
} from "../../../../../components/recent-announcements";
import {
	SimilarThreads,
	SimilarThreadsSkeleton,
} from "../../../../../components/similar-threads";
import { runtime } from "../../../../../lib/runtime";
import { getTenantData } from "../../../../../lib/tenant";

export async function generateStaticParams() {
	return [{ domain: "vapi.ai", messageId: "placeholder" }];
}

async function fetchTenantAndHeaderData(domain: string, messageId: bigint) {
	"use cache";
	cacheLife("minutes");
	cacheTag("tenant-message-page", domain, messageId.toString());

	return Effect.gen(function* () {
		const database = yield* Database;
		const tenant = yield* database.public.servers.getServerByDomain({
			domain,
		});
		const header = yield* database.public.messages.getMessagePageHeaderData({
			messageId,
		});
		return [tenant, header] as const;
	}).pipe(runtime.runPromise);
}

type Props = {
	params: Promise<{ domain: string; messageId: string }>;
	searchParams: Promise<{ cursor?: string; focus?: string }>;
};

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
	const data = await getTenantData(domain);
	if (!data) {
		return {};
	}
	const { tenant } = data;
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;
	const headerData = await fetchMessagePageHeaderData(parsed.value.id);
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
	firstMessage?: EnrichedMessage;
	server?: MessagePageHeaderData["server"];
	channel?: MessagePageHeaderData["channel"];
	cursor: string | null;
}) {
	"use cache";
	cacheLife("minutes");
	cacheTag(
		"tenant-replies-loader",
		props.channelId.toString(),
		props.after.toString(),
	);

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
			firstMessage={props.firstMessage}
			server={props.server}
			channel={props.channel}
			initialData={initialData}
			nextCursor={initialData.isDone ? null : initialData.continueCursor}
			currentCursor={props.cursor}
		/>
	);
}

async function TenantMessagePageContent(props: {
	domain: string;
	messageId: string;
	cursor: string | null;
}) {
	"use cache";
	cacheLife("minutes");
	cacheTag("tenant-message-page-content", props.domain, props.messageId);

	const parsed = parseSnowflakeId(props.messageId);
	if (Option.isNone(parsed)) {
		return notFound();
	}
	if (parsed.value.wasCleaned) {
		redirect(`/m/${parsed.value.cleaned}`);
	}

	const [tenantData, headerData] = await fetchTenantAndHeaderData(
		props.domain,
		parsed.value.id,
	);

	if (!tenantData?.server || !headerData) {
		return notFound();
	}

	if (headerData.server.discordId !== tenantData.server.discordId) {
		return notFound();
	}

	const canonicalId = headerData.canonicalId.toString();
	if (canonicalId !== props.messageId) {
		redirect(`/m/${canonicalId}?focus=${props.messageId}`);
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
							firstMessage={headerData.firstMessage ?? undefined}
							server={headerData.server}
							channel={headerData.channel}
							cursor={props.cursor}
						/>
					</Suspense>
				) : (
					<RepliesSkeleton />
				)
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
						currentParentChannelId={headerData.channel.id.toString()}
						serverId={headerData.server.discordId.toString()}
					/>
				</Suspense>
			}
			recentAnnouncementsSlot={
				<Suspense fallback={<RecentAnnouncementsSkeleton />}>
					<RecentAnnouncements
						serverId={headerData.server.discordId.toString()}
					/>
				</Suspense>
			}
		/>
	);
}

export default async function TenantMessagePage(props: Props) {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);
	const domain = decodeURIComponent(params.domain);
	const cursor = searchParams.cursor ? decodeCursor(searchParams.cursor) : null;

	return (
		<Suspense fallback={<MessagePageSkeleton />}>
			<TenantMessagePageContent
				domain={domain}
				messageId={params.messageId}
				cursor={cursor}
			/>
		</Suspense>
	);
}
