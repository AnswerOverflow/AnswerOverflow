"use client";

import type { api } from "@packages/database/convex/_generated/api";
import type { EnrichedMessage } from "@packages/ui/components/discord-message";
import { FormattedNumber } from "@packages/ui/components/formatted-number";
import { HelpfulFeedback } from "@packages/ui/components/helpful-feedback";
import { JumpToSolution } from "@packages/ui/components/jump-to-solution";
import { Link } from "@packages/ui/components/link";

import { MessageBody } from "@packages/ui/components/message-body";
import { MessageResultPageProvider } from "@packages/ui/components/message-result-page-context";
import { ServerIcon } from "@packages/ui/components/server-icon";
import { ServerInviteJoinButton } from "@packages/ui/components/server-invite";
import { useTenant } from "@packages/ui/components/tenant-context";
import { ThinMessage } from "@packages/ui/components/thin-message";
import { TimeAgo } from "@packages/ui/components/time-ago";
import { TrackLoad } from "@packages/ui/components/track-load";
import {
	channelToAnalyticsData,
	messageWithDiscordAccountToAnalyticsData,
	serverToAnalyticsData,
	threadToAnalyticsData,
} from "@packages/ui/utils/analytics";
import { isImageAttachment } from "@packages/ui/utils/attachments";
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
import { Array as Arr, Predicate } from "effect";
import { CheckCircle2, ExternalLink, MessageSquare } from "lucide-react";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { JsonLdScript } from "@/components/json-ld-script";

export type MessagePageHeaderData = NonNullable<
	FunctionReturnType<typeof api.private.messages.getMessagePageHeaderData>
>;

export type MessagePageReplies = FunctionReturnType<
	typeof api.private.messages.getMessagePageReplies
>;

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

function processRepliesForDisplay(
	replies: EnrichedMessage[],
	solutionMessageId: bigint | undefined,
): EnrichedMessage[] {
	let contents = "";
	const messagesBeingMerged: EnrichedMessage[] = [];
	const messagesWithMergedContent = replies.map((message, index) => {
		const nextMessage = replies.at(index + 1);
		contents += message.message.content;
		messagesBeingMerged.push(message);
		const isSameAuthor = message.author?.id === nextMessage?.author?.id;
		const isCollapsible =
			message.attachments.length === 0 &&
			(message.message.embeds?.length ?? 0) === 0 &&
			message.message.id !== solutionMessageId;
		const isNextMessageCollapsible =
			nextMessage &&
			nextMessage.attachments.length === 0 &&
			(nextMessage.message.embeds?.length ?? 0) === 0 &&
			nextMessage.message.id !== solutionMessageId;
		if (isSameAuthor && isCollapsible && isNextMessageCollapsible) {
			contents += "\n";
			return null;
		}
		const mergedContent = contents;
		const allEmbeds = messagesBeingMerged.flatMap(
			(msg) => msg.message.embeds ?? [],
		);
		const discordLinkRegex =
			/^https:\/\/discord\.com\/channels\/\d+\/\d+(?:\/\d+)?$/;
		const filteredEmbeds = allEmbeds.filter(
			(embed) => !embed.url || !discordLinkRegex.test(embed.url),
		);
		const allInternalLinks = messagesBeingMerged.flatMap(
			(msg) => msg.metadata?.internalLinks ?? [],
		);
		const result = {
			...message,
			message: {
				...message.message,
				content: mergedContent,
				embeds: filteredEmbeds.length > 0 ? filteredEmbeds : undefined,
			},
			metadata: message.metadata
				? {
						...message.metadata,
						internalLinks:
							allInternalLinks.length > 0
								? allInternalLinks
								: message.metadata.internalLinks,
					}
				: undefined,
		};
		contents = "";
		messagesBeingMerged.length = 0;
		return result;
	});

	const nonNull = Arr.filter(
		messagesWithMergedContent,
		Predicate.isNotNullable,
	);

	return nonNull.filter((message) => {
		if (DISCORD_CLIENT_ID && message.author?.id === BigInt(DISCORD_CLIENT_ID))
			return false;
		return true;
	});
}

export function RepliesSkeleton() {
	return (
		<div className="animate-pulse space-y-4">
			<div className="flex flex-row gap-4 border-b-2 border-muted py-4 pl-2">
				<div className="flex items-center gap-2">
					<MessageSquare className="size-4" />
					<div className="h-4 w-16 bg-muted rounded" />
				</div>
			</div>
			{[1, 2, 3].map((i) => (
				<div key={i} className="p-2 space-y-2">
					<div className="flex items-center gap-2">
						<div className="size-8 bg-muted rounded-full" />
						<div className="h-4 w-24 bg-muted rounded" />
					</div>
					<div className="ml-10 space-y-2">
						<div className="h-4 w-full bg-muted rounded" />
						<div className="h-4 w-3/4 bg-muted rounded" />
					</div>
				</div>
			))}
		</div>
	);
}

export function RepliesSection(props: {
	replies: EnrichedMessage[];
	channelId: bigint;
	threadId: bigint | null;
	solutionMessageId: bigint | undefined;
	firstMessageAuthorId?: bigint;
	server?: MessagePageHeaderData["server"];
	channel?: MessagePageHeaderData["channel"];
}) {
	const { replies, solutionMessageId, firstMessageAuthorId, server, channel } =
		props;

	const messagesToDisplay = processRepliesForDisplay(
		replies,
		solutionMessageId,
	);

	const messageStack = messagesToDisplay.map((message, index) => {
		const isLast = index === messagesToDisplay.length - 1;
		if (message.message.id === solutionMessageId) {
			return (
				<div key={message.message.id} id={`solution-${message.message.id}`}>
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
			<div
				className="p-2"
				key={message.message.id}
				id={`message-${message.message.id}`}
			>
				<ThinMessage
					message={message}
					op={message.author?.id === firstMessageAuthorId}
					isLast={isLast}
				/>
			</div>
		);
	});

	return (
		<>
			<div className="flex flex-row gap-4 border-b-2 border-muted py-4 pl-2">
				<div className="flex items-center gap-2">
					<MessageSquare className="size-4" />
					<span>
						{messagesToDisplay.length}{" "}
						{messagesToDisplay.length === 1 ? "Reply" : "Replies"}
					</span>
				</div>
			</div>
			<div className="rounded-md">
				<div className="flex flex-col gap-4">{messageStack}</div>
			</div>
			{messagesToDisplay.length === 0 && server && channel && (
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
			)}
		</>
	);
}

export function MessagePage(props: {
	headerData: MessagePageHeaderData;
	repliesSlot: ReactNode;
	similarThreadsSlot: ReactNode;
}) {
	const { headerData, repliesSlot, similarThreadsSlot } = props;
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

	const jsonLdData = {
		"@context": "https://schema.org",
		"@type": "DiscussionForumPosting",
		url: getSchemaUrl(),
		author: firstMessage?.author
			? {
					"@type": "Person",
					name: firstMessage.author.name,
					identifier: firstMessage.author.id.toString(),
					url: `/u/${firstMessage.author.id.toString()}`,
				}
			: undefined,
		image: firstMessageMedia?.url ? firstMessageMedia.url : undefined,
		headline: title,
		articleBody: rootMessageDeleted
			? "Original message was deleted"
			: firstMessage?.message.content,
		datePublished: firstMessage
			? getDate(firstMessage.message.id).toISOString()
			: undefined,
		dateModified: headerData.thread?.archivedTimestamp
			? new Date(Number(headerData.thread.archivedTimestamp)).toISOString()
			: undefined,
		identifier: (
			headerData.thread?.id ??
			firstMessage?.message.id ??
			headerData.canonicalId
		).toString(),
	};

	return (
		<MessageResultPageProvider>
			<div className="mx-auto pt-2">
				<JsonLdScript data={jsonLdData} scriptKey="message-jsonld" />

				<div className="flex w-full flex-col justify-center gap-4 md:flex-row">
					<main className="flex w-full max-w-3xl grow flex-col gap-4">
						<div className="flex flex-col gap-2 pl-2">
							<div className="flex flex-row items-center gap-2">
								<Link href={serverHref}>
									<ServerIcon server={headerData.server} size={48} />
								</Link>
								<div className="flex flex-col">
									<div className="flex flex-row items-center gap-2">
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
									</div>
									{!rootMessageDeleted && <UserLink />}
								</div>
							</div>
							{headerData.channel.type !== ChannelType.GuildAnnouncement && (
								<h1 className="text-2xl font-semibold">{title}</h1>
							)}
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
						{repliesSlot}
					</main>

					<div className="flex w-full shrink-0 flex-col items-center gap-4 text-center md:sticky md:top-[calc(var(--navbar-height)+1rem)] md:self-start md:w-[400px]">
						<div className="hidden w-full rounded-md border-2 bg-card drop-shadow-md md:block">
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
											className="flex flex-row-reverse items-center gap-1 text-sm font-semibold hover:underline"
										>
											<ExternalLink size={16} />
											View on Discord
										</Link>
									)}
								</div>
							</div>
						</div>
						{similarThreadsSlot}
						<div className="flex w-full flex-col justify-center gap-2 text-center">
							<HelpfulFeedback
								page={{
									...channelToAnalyticsData(headerData.channel),
									...serverToAnalyticsData(headerData.server),
									...(headerData.thread && {
										...threadToAnalyticsData(headerData.thread),
									}),
									...(firstMessage &&
										messageWithDiscordAccountToAnalyticsData({
											id: firstMessage.message.id,
											authorId: firstMessage.author?.id ?? "",
											serverId: firstMessage.message.serverId,
											channelId: firstMessage.message.channelId,
										})),
								}}
							/>
						</div>
					</div>

					<TrackLoad
						eventName="Message Page View"
						eventData={{
							...channelToAnalyticsData(headerData.channel),
							...serverToAnalyticsData(headerData.server),
							...(headerData.thread && {
								...threadToAnalyticsData(headerData.thread),
							}),
							...(firstMessage &&
								messageWithDiscordAccountToAnalyticsData({
									id: firstMessage.message.id,
									authorId: firstMessage.author?.id ?? "",
									serverId: firstMessage.message.serverId,
									channelId: firstMessage.message.channelId,
								})),
						}}
					/>
				</div>
			</div>
		</MessageResultPageProvider>
	);
}
