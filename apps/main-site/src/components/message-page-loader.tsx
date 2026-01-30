import type { api } from "@packages/database/convex/_generated/api";
import { Database } from "@packages/database/database";
import type { EnrichedMessage } from "@packages/ui/components/discord-message";
import { Skeleton } from "@packages/ui/components/skeleton";
import {
	getTenantCanonicalUrl,
	type TenantInfo,
} from "@packages/ui/utils/links";
import type { FunctionReturnType } from "convex/server";
import { Effect } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { runtime } from "../lib/runtime";
import { MessagePage, RepliesSection, RepliesSkeleton } from "./message-page";
import {
	RecentAnnouncements,
	RecentAnnouncementsSkeleton,
} from "./recent-announcements";
import { SimilarThreads, SimilarThreadsSkeleton } from "./similar-threads";

export function MessagePageSkeleton() {
	return (
		<div className="mx-auto pt-2 pb-16">
			<div className="flex w-full flex-col justify-center gap-4 md:flex-row">
				<main className="flex w-full max-w-3xl grow flex-col gap-4">
					<div className="flex flex-col gap-2 pl-2">
						<div className="flex flex-row items-center gap-2">
							<Skeleton className="h-12 w-12 rounded-full" />
							<div className="flex flex-col gap-1">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-24" />
							</div>
						</div>
						<Skeleton className="h-8 w-3/4" />
						<div className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					</div>
					<Skeleton className="h-px w-full my-4" />
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<div key={i} className="p-2">
								<div className="flex flex-row min-w-0">
									<Skeleton className="h-10 w-10 rounded-full shrink-0" />
									<div className="flex flex-col pl-2 pt-2 min-w-0 flex-1 gap-2">
										<div className="flex flex-row items-center gap-2">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-3 w-16" />
										</div>
										<Skeleton className="h-4 w-full" />
										<Skeleton className="h-4 w-3/4" />
									</div>
								</div>
							</div>
						))}
					</div>
				</main>
				<div className="hidden md:flex w-[400px] shrink-0 flex-col items-center gap-4">
					<div className="w-full rounded-md border-2 bg-card overflow-hidden">
						<Skeleton className="w-full aspect-[5/2]" />
						<div className="flex flex-col items-start gap-4 p-4">
							<div className="flex w-full flex-row items-center justify-between">
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-8 w-16 rounded-3xl" />
							</div>
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-3/4" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export type MessagePageHeaderData = NonNullable<
	FunctionReturnType<typeof api.public.messages.getMessagePageHeaderData>
>;

export type MessagePageReplies = FunctionReturnType<
	typeof api.public.messages.getMessages
>;

export async function fetchMessagePageHeaderData(
	messageId: bigint,
): Promise<MessagePageHeaderData | null> {
	"use cache";
	cacheLife("minutes");
	cacheTag("message-header", messageId.toString());

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
	"use cache";
	cacheLife("minutes");
	cacheTag("message-replies", args.channelId.toString(), args.after.toString());

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
	"use cache";
	cacheLife("minutes");
	cacheTag(
		"replies-loader",
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

export async function MessagePageLoader(props: {
	headerData: MessagePageHeaderData | null;
	messageId: string;
	cursor?: string;
}) {
	"use cache";
	cacheLife("minutes");
	if (props.headerData) {
		cacheTag("message-page-loader", props.headerData.canonicalId.toString());
	}

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
						currentParentChannelId={headerData.channel.id.toString()}
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
