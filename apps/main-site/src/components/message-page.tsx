"use client";

import type { api } from "@packages/database/convex/_generated/api";
import type { EnrichedMessage } from "@packages/ui/components/discord-message";
import { FormattedNumber } from "@packages/ui/components/formatted-number";
import { HelpfulFeedback } from "@packages/ui/components/helpful-feedback";
import { JumpToSolution } from "@packages/ui/components/jump-to-solution";
import { Link } from "@packages/ui/components/link";
import { MessageBlurrer } from "@packages/ui/components/message-blurrer";
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
import { ExternalLink, MessageSquare } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect } from "react";
import { JsonLdScript } from "@/components/json-ld-script";
import { SimilarThreads } from "@/components/similar-threads";

type MessagePageData = NonNullable<
	FunctionReturnType<typeof api.private.messages.getMessagePageData>
>;

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

export function MessagePage(props: { data: MessagePageData }) {
	const { data } = props;
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

	if (!data) {
		return (
			<div className="max-w-4xl mx-auto p-8">
				<div className="text-center text-muted-foreground">
					Message not found
				</div>
			</div>
		);
	}

	const rootMessageDeleted = data.rootMessageDeleted;
	const firstMessage = rootMessageDeleted ? undefined : data.messages.at(0);

	if (!firstMessage && !rootMessageDeleted) {
		return (
			<div className="max-w-4xl mx-auto p-8">
				<div className="text-center text-muted-foreground">
					No messages found
				</div>
			</div>
		);
	}

	if (!data.thread && rootMessageDeleted) {
		return (
			<div className="max-w-4xl mx-auto p-8">
				<div className="text-center text-muted-foreground">
					Message not found
				</div>
			</div>
		);
	}

	const solutionMessageId = firstMessage?.solutions?.at(0)?.id;
	const solution = data.messages.find(
		(message) => message.message.id === solutionMessageId,
	);

	let contents = "";
	const messagesBeingMerged: EnrichedMessage[] = [];
	const messagesWithMergedContent = data.messages.map((message, index) => {
		if (firstMessage && message.message.id === firstMessage.message.id)
			return null;
		const nextMessage = data.messages.at(index + 1);
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
	const messagesToDisplay = nonNull.filter((message) => {
		if (firstMessage && message.message.id === firstMessage.message.id)
			return false;
		if (data.thread || message.message.parentChannelId) {
			if (message.message.channelId !== data.channel.id) return false;
		} else {
			if (
				message.message.parentChannelId &&
				message.message.parentChannelId !== data.channel.id
			)
				return false;
		}
		if (DISCORD_CLIENT_ID && message.author?.id === BigInt(DISCORD_CLIENT_ID))
			return false;
		return true;
	});

	const messageStack = messagesToDisplay
		.map((message, index) => {
			const isLast = index === messagesToDisplay.length - 1;
			if (message.message.id === solutionMessageId) {
				return (
					<div key={message.message.id} id={`solution-${message.message.id}`}>
						<span className="text-green-700 dark:text-green-400">Solution</span>
						<div className="rounded-lg border-2 border-green-500 p-2 dark:border-green-400">
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
						op={message.author?.id === firstMessage?.author?.id}
						isLast={isLast}
					/>
				</div>
			);
		})
		.filter(Boolean);

	const title =
		data.thread?.name ?? firstMessage?.message.content?.slice(0, 100);
	const firstMessageMedia = firstMessage?.attachments
		.filter((attachment) => isImageAttachment(attachment))
		.at(0);

	const serverHref = tenant ? "/" : `/c/${data.server.discordId.toString()}`;

	const UserLink = () =>
		firstMessage?.author ? (
			<Link
				href={`/u/${firstMessage.author.id.toString()}`}
				className="hover:underline"
			>
				{firstMessage.author.name}
			</Link>
		) : null;

	const Main = () => (
		<main className="flex w-full max-w-3xl grow flex-col gap-4">
			<div className="flex flex-col gap-2 pl-2">
				<div className="flex flex-row items-center gap-2">
					<Link href={serverHref}>
						<ServerIcon server={data.server} size={48} />
					</Link>
					<div className="flex flex-col">
						<div className="flex flex-row items-center gap-2">
							<Link href={serverHref} className="hover:underline">
								{data.server.name}
							</Link>
							{firstMessage && !rootMessageDeleted && (
								<>
									<span className="text-sm text-muted-foreground">•</span>
									<TimeAgo snowflake={firstMessage.message.id.toString()} />
								</>
							)}
						</div>
						{!rootMessageDeleted && <UserLink />}
					</div>
				</div>
				{data.channel.type !== ChannelType.GuildAnnouncement && (
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
					{solution && (
						<div className="mt-4 w-full rounded-lg border-2 border-green-500 p-2 dark:border-green-400">
							<span className="text-green-800 dark:text-green-400">
								Solution:
							</span>

							<MessageBlurrer message={solution}>
								<MessageBody message={solution} collapseContent={true} />
							</MessageBlurrer>

							<JumpToSolution id={solution.message.id.toString()} />
						</div>
					)}
				</div>
			</div>
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
			{messagesToDisplay.length === 0 && (
				<div className="flex flex-col gap-4 rounded-md border-2 border-solid border-secondary p-4">
					<span className="text-lg font-semibold">No replies yet</span>
					<span className="text-muted-foreground">
						Be the first to reply to this message
					</span>
					<ServerInviteJoinButton
						server={data.server}
						channel={data.channel}
						location="Message Result Page"
					/>
				</div>
			)}
		</main>
	);

	const discordUrl = firstMessage
		? getDiscordURLForMessage({
				serverId: firstMessage.message.serverId,
				channelId: firstMessage.message.channelId,
				id: firstMessage.message.id,
			})
		: data.thread
			? `https://discord.com/channels/${data.server.discordId}/${data.thread.id}`
			: undefined;

	const Sidebar = () => (
		<div className="flex w-full shrink-0 flex-col items-center gap-4 text-center md:sticky md:top-[calc(var(--navbar-height)+1rem)] md:self-start md:w-[400px]">
			<div className="hidden w-full rounded-md border-2 bg-card drop-shadow-md md:block">
				<div className="flex flex-col items-start gap-4 p-4">
					<div className="flex w-full flex-row items-center justify-between truncate font-bold">
						<Link href={tenant ? "/" : getServerHomepageUrl(data.server)}>
							{data.server.name}
						</Link>
						<ServerInviteJoinButton
							server={data.server}
							channel={data.channel}
							location="Message Result Page"
							size="sm"
							variant="default"
							className="rounded-3xl text-xs font-semibold"
						/>
					</div>
					{data.server.description && (
						<span className="text-left text-sm">{data.server.description}</span>
					)}
					<div className="flex w-full flex-row items-center justify-between">
						{data.server.approximateMemberCount !== undefined && (
							<div className="flex flex-col items-start">
								<span className="text-sm font-semibold">
									<FormattedNumber value={data.server.approximateMemberCount} />
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
			<SimilarThreads
				searchQuery={
					data.thread?.name ??
					firstMessage?.message.content?.slice(0, 100) ??
					""
				}
				currentThreadId={(
					data.thread?.id ??
					firstMessage?.message.id ??
					data.canonicalId
				).toString()}
				currentServerId={data.server.discordId.toString()}
				serverId={tenant ? data.server.discordId.toString() : undefined}
			/>
			<div className="flex w-full flex-col justify-center gap-2 text-center">
				<HelpfulFeedback
					page={{
						...channelToAnalyticsData(data.channel),
						...serverToAnalyticsData(data.server),
						...(data.thread && {
							...threadToAnalyticsData(data.thread),
							"Number of Messages": data.messages.length,
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
	);

	const getSchemaUrl = () => {
		const canonicalId = (
			data.thread?.id ??
			firstMessage?.message.id ??
			data.canonicalId
		).toString();
		if (data.server.customDomain) {
			const customUrl = getServerCustomUrl(data.server, `/m/${canonicalId}`);
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
		dateModified: data.thread?.archivedTimestamp
			? new Date(Number(data.thread.archivedTimestamp)).toISOString()
			: undefined,
		identifier: (
			data.thread?.id ??
			firstMessage?.message.id ??
			data.canonicalId
		).toString(),
		commentCount: messagesToDisplay.length,
		comment: messagesToDisplay.map((message, index) => ({
			"@type": message.message.id === solutionMessageId ? "Answer" : "Comment",
			text: message.message.content,
			identifier: message.message.id.toString(),
			datePublished: getDate(message.message.id).toISOString(),
			position: index + 1,
			author: message.author
				? {
						"@type": "Person",
						name: message.author.name,
						identifier: message.author.id.toString(),
						url: `/u/${message.author.id.toString()}`,
					}
				: undefined,
		})),
	};

	return (
		<MessageResultPageProvider>
			<div className="mx-auto pt-2">
				<JsonLdScript data={jsonLdData} scriptKey="message-jsonld" />

				<div className="flex w-full flex-col justify-center gap-4 md:flex-row">
					<Main />
					<Sidebar />
					<TrackLoad
						eventName="Message Page View"
						eventData={{
							...channelToAnalyticsData(data.channel),
							...serverToAnalyticsData(data.server),
							...(data.thread && {
								...threadToAnalyticsData(data.thread),
								"Number of Messages": data.messages.length,
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
