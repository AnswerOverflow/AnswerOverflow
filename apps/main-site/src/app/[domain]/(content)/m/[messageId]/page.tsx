import { Database } from "@packages/database/database";
import type { EnrichedMessage } from "@packages/ui/components/discord-message";
import { decodeCursor, encodeCursor } from "@packages/ui/utils/cursor";
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
import {
	buildSearchQueryString,
	getFirstSearchParamValue,
} from "../../../../../lib/search-params";
import { getTenantData } from "../../../../../lib/tenant";

export function generateStaticParams() {
	return [{ domain: "placeholder", messageId: "placeholder" }];
}

async function fetchTenantAndHeaderData(domain: string, messageId: bigint) {
	// "use cache";

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

type SearchParams = {
	cursor?: string | string[];
	focus?: string | string[];
};

type Props = {
	params: Promise<{ domain: string; messageId: string }>;
	searchParams: Promise<SearchParams>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const searchParams = await props.searchParams;
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
	const headerData = await fetchMessagePageHeaderData(parsed.value.id);
	return generateMessagePageMetadata(headerData, params.messageId, {
		cursorParam: getFirstSearchParamValue(searchParams.cursor),
		focusMessageId: getFirstSearchParamValue(searchParams.focus),
		tenant,
	});
}

async function RepliesLoader(props: {
	channelId: bigint;
	after: bigint;
	solutionMessageId: bigint | undefined;
	firstMessage?: EnrichedMessage;
	server?: MessagePageHeaderData["server"];
	channel?: MessagePageHeaderData["channel"];
	cursor: string | null;
	firstPageHref: string;
}) {
	// "use cache";

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
			firstPageHref={props.firstPageHref}
		/>
	);
}

async function TenantMessagePageContent(props: {
	domain: string;
	messageId: string;
	searchParams: Promise<SearchParams>;
}) {
	const params = await props.searchParams;
	const cursorParam = getFirstSearchParamValue(params.cursor);
	const cursor = cursorParam ? decodeCursor(cursorParam) : null;

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
		redirect(
			`/m/${canonicalId}${buildSearchQueryString({
				focus: props.messageId,
				cursor: cursor ? encodeCursor(cursor) : undefined,
			})}`,
		);
	}

	const solutionMessageId = headerData.solutionMessage?.message.id;
	const queryChannelId = headerData.threadId ?? headerData.channelId;
	const afterMessageId =
		headerData.threadId ?? headerData.firstMessage?.message.id;
	const firstPageHref = `/m/${canonicalId}`;

	return (
		<MessagePage
			headerData={headerData}
			sponsorIndex={Math.floor(Math.random() * 1000)}
			bowieImageIndex={Math.floor(Math.random() * 1000)}
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
							cursor={cursor}
							firstPageHref={firstPageHref}
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
	const params = await props.params;
	const domain = decodeURIComponent(params.domain);

	return (
		<Suspense fallback={<MessagePageSkeleton />}>
			<TenantMessagePageContent
				domain={domain}
				messageId={params.messageId}
				searchParams={props.searchParams}
			/>
		</Suspense>
	);
}
