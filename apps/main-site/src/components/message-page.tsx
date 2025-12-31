"use client";

import { api } from "@packages/database/convex/_generated/api";
import { ConvexInfiniteList } from "@packages/ui/components/convex-infinite-list";
import { DiscordAvatar } from "@packages/ui/components/discord-avatar";
import type { EnrichedMessage } from "@packages/ui/components/discord-message";
import { FormattedNumber } from "@packages/ui/components/formatted-number";
import { HelpfulFeedback } from "@packages/ui/components/helpful-feedback";
import { JumpToSolution } from "@packages/ui/components/jump-to-solution";
import { Link } from "@packages/ui/components/link";
import { MessageBody } from "@packages/ui/components/message-body";
import { MessageResultPageProvider } from "@packages/ui/components/message-result-page-context";
import { Separator } from "@packages/ui/components/separator";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { ServerInviteJoinButton } from "@packages/ui/components/server-invite";
import { useTenant } from "@packages/ui/components/tenant-context";
import { ThinMessage } from "@packages/ui/components/thin-message";
import { TimeAgo } from "@packages/ui/components/time-ago";
import { TrackLoad } from "@packages/ui/components/track-load";
import { isImageAttachment } from "@packages/ui/utils/attachments";
import { encodeCursor } from "@packages/ui/utils/cursor";
import {
	ChannelType,
	getDiscordURLForMessage,
} from "@packages/ui/utils/discord";
import {
	getServerCustomUrl,
	getServerHomepageUrl,
} from "@packages/ui/utils/server";
import { getDate } from "@packages/ui/utils/snowflake";
import type { FunctionReturnType } from "convex/server";
import { CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { JsonLdScript } from "@/components/json-ld-script";
import { ResourcesSidebar } from "@/components/resources-sidebar";

export type MessagePageHeaderData = NonNullable<
	FunctionReturnType<typeof api.public.messages.getMessagePageHeaderData>
>;

export type MessagePageReplies = FunctionReturnType<
	typeof api.public.messages.getMessages
>;

export function RepliesSkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2, 3].map((i) => (
				<ReplyMessageSkeleton key={i} />
			))}
		</div>
	);
}

function ReplyMessageSkeleton() {
	return (
		<div className="p-2">
			<div className="flex flex-row min-w-0">
				<div className="w-[40px] shrink-0">
					<div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
				</div>
				<div className="flex flex-col pl-2 pt-2 min-w-0 flex-1 gap-2">
					<div className="flex flex-row items-center gap-2">
						<div className="h-4 w-24 bg-muted rounded animate-pulse" />
						<div className="h-3 w-3 bg-muted rounded-full animate-pulse" />
						<div className="h-3 w-16 bg-muted rounded animate-pulse" />
					</div>
					<div className="space-y-2">
						<div className="h-4 w-full bg-muted rounded animate-pulse" />
						<div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
					</div>
				</div>
			</div>
		</div>
	);
}

function ReplyMessage(props: {
	message: EnrichedMessage;
	solutionMessageId: bigint | undefined;
	firstMessageAuthorId?: bigint;
	isLast: boolean;
}) {
	const { message, solutionMessageId, firstMessageAuthorId, isLast } = props;

	if (message.message.id === solutionMessageId) {
		return (
			<div id={`solution-${message.message.id}`}>
				<div className="flex items-center gap-1.5 mb-2">
					<CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
					<span className="text-sm font-medium text-green-600 dark:text-green-500">
						Solution
					</span>
				</div>
				<div className="rounded-xl border border-green-500/30 bg-green-500/5 dark:bg-green-500/10 p-3">
					<ThinMessage message={message} isLast={isLast} />
				</div>
			</div>
		);
	}

	return (
		<div className="p-2" id={`message-${message.message.id}`}>
			<ThinMessage
				message={message}
				op={message.author?.id === firstMessageAuthorId}
				isLast={isLast}
			/>
		</div>
	);
}

const HIDDEN_AUTHOR_IDS = [958907348389339146n];

export function RepliesSection(props: {
	channelId: bigint;
	after: bigint;
	solutionMessageId: bigint | undefined;
	firstMessage?: EnrichedMessage;
	server?: MessagePageHeaderData["server"];
	channel?: MessagePageHeaderData["channel"];
	initialData?: MessagePageReplies;
	nextCursor?: string | null;
	currentCursor?: string | null;
}) {
	const {
		channelId,
		after,
		solutionMessageId,
		firstMessage,
		server,
		channel,
		initialData,
		nextCursor,
	} = props;

	const filterMessages = (messages: MessagePageReplies["page"]) =>
		messages.filter(
			(m) =>
				!HIDDEN_AUTHOR_IDS.includes(m.message.authorId) &&
				m.message.id !== firstMessage?.message.id,
		);

	const filteredInitialData = initialData
		? {
				...initialData,
				page: filterMessages(initialData.page),
			}
		: undefined;

	return (
		<>
			<div className="rounded-md">
				<div className="flex flex-col gap-4">
					<ConvexInfiniteList
						query={api.public.messages.getMessages}
						queryArgs={{
							channelId,
							after,
						}}
						pageSize={50}
						initialLoaderCount={3}
						loader={<ReplyMessageSkeleton />}
						initialData={filteredInitialData}
						filterResults={filterMessages}
						emptyState={
							server && channel ? (
								<div className="flex flex-col gap-4 rounded-md border-2 border-solid border-secondary p-4">
									<span className="text-lg font-semibold">No replies yet</span>
									<span className="text-muted-foreground">
										Be the first to reply to this message
									</span>
									<ServerInviteJoinButton
										server={server}
										channel={channel}
										location="Message Result Page"
									/>
								</div>
							) : (
								<div className="text-center py-12 text-muted-foreground">
									No replies yet
								</div>
							)
						}
						renderItem={(message) => (
							<ReplyMessage
								key={message.message.id.toString()}
								message={message}
								solutionMessageId={solutionMessageId}
								firstMessageAuthorId={firstMessage?.author?.id}
								isLast={false}
							/>
						)}
					/>
				</div>
			</div>
			{nextCursor && (
				<a
					href={`?cursor=${encodeCursor(nextCursor)}`}
					className="sr-only"
					aria-hidden="true"
				>
					Next page
				</a>
			)}
		</>
	);
}

export function MessagePage(props: {
	headerData: MessagePageHeaderData;
	threadTagsSlot?: ReactNode;
	repliesSlot: ReactNode;
	similarThreadsSlot: ReactNode;
	recentAnnouncementsSlot?: ReactNode;
}) {
	const {
		headerData,
		threadTagsSlot,
		repliesSlot,
		similarThreadsSlot,
		recentAnnouncementsSlot,
	} = props;

	const tenant = useTenant();
	const [focusMessageId] = useQueryState("focus");

	useEffect(() => {
		if (focusMessageId) {
			const element = document.getElementById(`message-${focusMessageId}`);
			if (element) {
				element.scrollIntoView({ behavior: "instant", block: "center" });
			}
		}
	}, [focusMessageId]);

	const rootMessageDeleted = headerData.firstMessage === null;
	const firstMessage = headerData.firstMessage;
	const solutionMessage = headerData.solutionMessage;
	const solutionMessageId = solutionMessage?.message.id;

	const title =
		headerData.thread?.name ?? firstMessage?.message.content?.slice(0, 100);
	const firstMessageMedia = firstMessage?.attachments
		.filter((attachment) => isImageAttachment(attachment))
		.at(0);

	const serverHref = tenant
		? "/"
		: `/c/${headerData.server.discordId.toString()}`;

	const UserLink = () =>
		firstMessage?.author ? (
			<Link
				href={`/u/${firstMessage.author.id.toString()}`}
				className="hover:underline"
			>
				{firstMessage.author.name}
			</Link>
		) : null;

	const discordUrl = firstMessage
		? getDiscordURLForMessage({
				serverId: firstMessage.message.serverId,
				channelId: firstMessage.message.channelId,
				id: firstMessage.message.id,
			})
		: headerData.thread
			? `https://discord.com/channels/${headerData.server.discordId}/${headerData.thread.id}`
			: undefined;

	const getSchemaUrl = () => {
		const canonicalId = (
			headerData.thread?.id ??
			firstMessage?.message.id ??
			headerData.canonicalId
		).toString();
		if (headerData.server.customDomain) {
			const customUrl = getServerCustomUrl(
				headerData.server,
				`/m/${canonicalId}`,
			);
			if (customUrl) return customUrl;
		}
		const baseUrl =
			process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.answeroverflow.com";
		return `${baseUrl}/m/${canonicalId}`;
	};

	const getTextContent = () => {
		if (rootMessageDeleted) {
			return undefined;
		}
		const content = firstMessage?.message.content;
		if (content && content.trim().length > 0) {
			return content;
		}
		return undefined;
	};

	const textContent = getTextContent();
	const hasImage = Boolean(firstMessageMedia?.url);
	const hasValidContent = Boolean(textContent) || hasImage;
	const hasAuthor = Boolean(firstMessage?.author);
	const canRenderJsonLd = hasValidContent && hasAuthor;

	const jsonLdData =
		canRenderJsonLd && firstMessage?.author
			? {
					"@context": "https://schema.org",
					"@type": "DiscussionForumPosting",
					url: getSchemaUrl(),
					author: {
						"@type": "Person",
						name: firstMessage.author.name,
						identifier: firstMessage.author.id.toString(),
						url: `/u/${firstMessage.author.id.toString()}`,
					},
					image: firstMessageMedia?.url ? firstMessageMedia.url : undefined,
					headline: title,
					text: textContent,
					datePublished: headerData.thread
						? getDate(headerData.thread.id).toISOString()
						: getDate(firstMessage.message.id).toISOString(),
					dateModified: headerData.thread?.archivedTimestamp
						? new Date(
								Number(headerData.thread.archivedTimestamp),
							).toISOString()
						: undefined,
					identifier: (
						headerData.thread?.id ??
						firstMessage?.message.id ??
						headerData.canonicalId
					).toString(),
				}
			: null;

	return (
		<MessageResultPageProvider>
			<div className="mx-auto pt-2 pb-16">
				{jsonLdData && (
					<JsonLdScript data={jsonLdData} scriptKey="message-jsonld" />
				)}

				<div className="flex w-full flex-col justify-center gap-4 md:flex-row">
					<main className="flex w-full max-w-3xl grow flex-col gap-4">
						<div className="flex flex-col gap-2 pl-2">
							<div className="flex flex-row items-center gap-2">
								{tenant && firstMessage?.author ? (
									<DiscordAvatar user={firstMessage.author} size={48} />
								) : (
									<Link href={serverHref}>
										<ServerIcon server={headerData.server} size={48} />
									</Link>
								)}

								<div className="flex flex-col">
									<div className="flex flex-row items-center gap-2 flex-wrap">
										<Link href={serverHref} className="hover:underline">
											{headerData.server.name}
										</Link>
										{firstMessage && !rootMessageDeleted && (
											<>
												<span className="text-sm text-muted-foreground">•</span>
												<TimeAgo
													snowflake={firstMessage.message.id.toString()}
												/>
											</>
										)}
										{headerData.replyCount > 0 && (
											<>
												<span className="text-sm text-muted-foreground">•</span>
												<div className="flex items-center gap-1 text-muted-foreground">
													<MessageSquare className="size-3.5" />
													<span className="text-sm">
														{headerData.replyCount}{" "}
														{headerData.replyCount === 1 ? "reply" : "replies"}
													</span>
												</div>
											</>
										)}
									</div>
									{!rootMessageDeleted && <UserLink />}
								</div>
							</div>
							{headerData.channel.type !== ChannelType.GuildAnnouncement && (
								<h1 className="text-2xl font-semibold">{title}</h1>
							)}
							{threadTagsSlot}
							<div>
								{rootMessageDeleted ? (
									<div className="text-muted-foreground italic">
										Original message was deleted
									</div>
								) : (
									firstMessage && (
										<MessageBody message={firstMessage} loadingStyle="eager" />
									)
								)}
								{solutionMessage && (
									<div className="mt-6 w-full rounded-xl border border-green-500/30 bg-green-500/5 dark:bg-green-500/10 p-4">
										<div className="flex items-center gap-1.5 mb-3">
											<CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
											<span className="text-sm font-medium text-green-600 dark:text-green-500">
												Solution
											</span>
										</div>
										<MessageBody
											message={solutionMessage}
											collapseContent={true}
										/>
										<div className="mt-3">
											<JumpToSolution
												id={solutionMessageId?.toString() ?? ""}
											/>
										</div>
									</div>
								)}
							</div>
						</div>
						<Separator className="my-4" />
						{repliesSlot}
					</main>

					<div className="flex w-full shrink-0 flex-col items-center gap-4 text-center md:self-start md:w-[400px] [@media(min-height:800px)]:sticky [@media(min-height:800px)]:top-[calc(var(--navbar-height)+1rem)]">
						<div className="hidden w-full rounded-md border-2 bg-card drop-shadow-md md:block overflow-hidden">
							{headerData.server.banner && (
								<img
									src={`https://cdn.discordapp.com/banners/${headerData.server.discordId}/${headerData.server.banner}.webp?size=480`}
									alt={`${headerData.server.name} banner`}
									className="w-full aspect-[5/2] object-cover"
								/>
							)}
							<div className="flex flex-col items-start gap-4 p-4">
								<div className="flex w-full flex-row items-center justify-between truncate font-bold">
									<Link
										href={
											tenant ? "/" : getServerHomepageUrl(headerData.server)
										}
									>
										{headerData.server.name}
									</Link>
									<ServerInviteJoinButton
										server={headerData.server}
										channel={headerData.channel}
										location="Message Result Page"
										size="sm"
										variant="default"
										className="rounded-3xl text-xs font-semibold"
									/>
								</div>
								{headerData.server.description && (
									<span className="text-left text-sm">
										{headerData.server.description}
									</span>
								)}
								<div className="flex w-full flex-row items-center justify-between">
									{headerData.server.approximateMemberCount !== undefined && (
										<div className="flex flex-col items-start">
											<span className="text-sm font-semibold">
												<FormattedNumber
													value={headerData.server.approximateMemberCount}
												/>
											</span>
											<span className="text-xs">Members</span>
										</div>
									)}
									{discordUrl && (
										<Link
											href={discordUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-row-reverse items-center gap-1 text-sm font-semibold hover:underline"
										>
											<ExternalLink size={16} />
											View on Discord
										</Link>
									)}
								</div>
								<ResourcesSidebar className="w-full pt-4 border-t" />
								{recentAnnouncementsSlot}
							</div>
						</div>
						{similarThreadsSlot}
						{firstMessage && (
							<div className="flex w-full flex-col justify-center gap-2 text-center">
								<HelpfulFeedback
									server={{
										id: headerData.server.discordId.toString(),
										name: headerData.server.name,
									}}
									channel={{
										id: headerData.channel.id.toString(),
										name: headerData.channel.name,
										type: headerData.channel.type,
										serverId: headerData.server.discordId.toString(),
										inviteCode: headerData.channel.inviteCode,
									}}
									thread={
										headerData.thread
											? {
													id: headerData.thread.id.toString(),
													name: headerData.thread.name,
													type: headerData.thread.type,
												}
											: null
									}
									message={{
										id: firstMessage.message.id.toString(),
										authorId: (firstMessage.author?.id ?? 0n).toString(),
										serverId: firstMessage.message.serverId.toString(),
										channelId: firstMessage.message.channelId.toString(),
									}}
								/>
							</div>
						)}
					</div>

					{firstMessage && (
						<TrackLoad
							eventName="Message Page View"
							eventData={{
								server: {
									id: headerData.server.discordId.toString(),
									name: headerData.server.name,
								},
								channel: {
									id: headerData.channel.id.toString(),
									name: headerData.channel.name,
									type: headerData.channel.type,
									serverId: headerData.server.discordId.toString(),
									inviteCode: headerData.channel.inviteCode,
								},
								thread: headerData.thread
									? {
											id: headerData.thread.id.toString(),
											name: headerData.thread.name,
											type: headerData.thread.type,
										}
									: null,
								message: {
									id: firstMessage.message.id.toString(),
									authorId: (firstMessage.author?.id ?? 0n).toString(),
									serverId: firstMessage.message.serverId.toString(),
									channelId: firstMessage.message.channelId.toString(),
								},
							}}
						/>
					)}
				</div>
			</div>
		</MessageResultPageProvider>
	);
}
