import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import type { EnrichedMessage } from "@packages/ui/components/discord-message";
import {
	getTenantCanonicalUrl,
	type TenantInfo,
} from "@packages/ui/utils/links";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { runtime } from "../lib/runtime";
import { MessagePage, RepliesSection, RepliesSkeleton } from "./message-page";
import {
	RecentAnnouncements,
	RecentAnnouncementsSkeleton,
} from "./recent-announcements";
import { SimilarThreads, SimilarThreadsSkeleton } from "./similar-threads";
import { ThreadTags, ThreadTagsSkeleton } from "./thread-tags";

export type MessagePageHeaderData = NonNullable<
	FunctionReturnType<typeof api.public.messages.getMessagePageHeaderData>
>;

export type MessagePageReplies = FunctionReturnType<
	typeof api.public.messages.getMessages
>;

export async function fetchMessagePageHeaderData(
	messageId: bigint,
): Promise<MessagePageHeaderData | null> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.messages.getMessagePageHeaderData({
			messageId,
		});
	}).pipe(runtime.runPromise);
}

export async function fetchMessagePageReplies(args: {
	channelId: bigint;
	after: bigint;
	cursor: string | null;
}): Promise<MessagePageReplies> {
	return Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.messages.getMessages({
			channelId: args.channelId,
			after: args.after,
			paginationOpts: { numItems: 50, cursor: args.cursor },
		});
	}).pipe(runtime.runPromise);
}

export function generateMessagePageMetadata(
	headerData: MessagePageHeaderData | null,
	messageId: string,
	cursor: string | null = null,
	tenant: TenantInfo | null = null,
): Metadata {
	if (!headerData) {
		return {};
	}

	const isTenant = tenant !== null;
	const { firstMessage } = headerData;
	const rootMessageDeleted = !firstMessage;
	const title =
		headerData.thread?.name ??
		firstMessage?.message.content?.slice(0, 100) ??
		headerData.channel.name;
	const description = rootMessageDeleted
		? `Discussion in ${headerData.thread?.name ?? headerData.channel.name} - ${headerData.server.name}`
		: firstMessage?.message.content && firstMessage.message.content.length > 0
			? firstMessage.message.content
			: `Questions related to ${headerData.channel.name} in ${headerData.server.name}`;

	const ogImageUrl = isTenant
		? `/og/post?id=${messageId}&tenant=true`
		: `/og/post?id=${messageId}`;

	const fullTitle = `${title} - ${headerData.server.name}`;
	const path = `/m/${headerData.canonicalId.toString()}`;
	const canonicalUrl = getTenantCanonicalUrl(tenant, path);

	return {
		title: fullTitle,
		description,
		openGraph: {
			type: "website",
			siteName: isTenant ? headerData.server.name : "Answer Overflow",
			images: [ogImageUrl],
			title: fullTitle,
			description,
		},
		twitter: {
			card: "summary_large_image",
			title: fullTitle,
			description,
			images: [ogImageUrl],
		},
		alternates: {
			canonical: canonicalUrl,
		},
		robots: cursor ? "noindex, follow" : "index, follow",
	};
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

export function MessagePageLoader(props: {
	headerData: MessagePageHeaderData | null;
	messageId: string;
	cursor?: string;
}) {
	const { headerData, messageId, cursor } = props;

	if (!headerData) {
		return notFound();
	}

	const hasThread = headerData.thread !== null;
	const rootMessageDeleted = !headerData.firstMessage;

	if (rootMessageDeleted && !hasThread) {
		return notFound();
	}

	const canonicalId = headerData.canonicalId.toString();

	if (canonicalId !== messageId) {
		redirect(`/m/${canonicalId}?focus=${messageId}`);
	}

	const solutionMessageId = headerData.solutionMessage?.message.id;

	const queryChannelId = headerData.threadId ?? headerData.channelId;
	const afterMessageId =
		headerData.threadId ?? headerData.firstMessage?.message.id;

	const threadTagsSlot =
		headerData.thread && headerData.channel.availableTags ? (
			<Suspense fallback={<ThreadTagsSkeleton />}>
				<ThreadTags
					threadId={headerData.thread.id.toString()}
					availableTags={headerData.channel.availableTags}
				/>
			</Suspense>
		) : null;

	return (
		<MessagePage
			headerData={headerData}
			threadTagsSlot={threadTagsSlot}
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
							cursor={cursor ?? null}
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
