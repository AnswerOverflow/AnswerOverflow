import type { ChannelPublicWithFlags, MessageFull } from '@answeroverflow/db';
import type { ServerPublic } from '@answeroverflow/api';
import type { DiscussionForumPosting } from 'schema-dts';
import { ServerInviteJoinButton } from '../server-invite';
import { MessageBlurrer, MessageBody } from '../message/Message';
import Link from '../ui/link';
import { TrackLoad } from '../ui/track-load';
import {
	channelToAnalyticsData,
	serverToAnalyticsData,
	threadToAnalyticsData,
} from '@answeroverflow/constants/src/analytics';
import { messageWithDiscordAccountToAnalyticsData } from '@answeroverflow/hooks';
import { TrackLinkButton } from '../ui/track-link-button';
import { LazyInviteToAnswerOverflowPopover } from './message-result-page/lazy-invite-to-answer-overflow-popover';
import { ServerIcon } from '../server-icon';
import { CarbonAds } from '../ui/ads';
import { FormattedNumber } from '../ui/numbers';
import { ThinMessage } from '../message/thin-message';
import { getDiscordURLForMessage } from '../utils/discord';
import { ExternalLink } from 'lucide-react';
import { getDate } from '../utils/snowflake';
import { getMainSiteHostname } from '@answeroverflow/constants';
import { isImageAttachment } from '../message/attachments';
import { TimeAgo } from '../ui/time-ago';
import { DiscordAvatar } from '../discord-avatar';
import { FaRegMessage } from 'react-icons/fa6';

import { JsonLd } from 'react-schemaorg';
import { InKeepWidget } from './inkeep';
import { LoadMoreMessages } from './load-more-messages';
import { MessageResultPageProvider } from './message-result-page-context';
import { JumpToSolution } from './jump-to-solution';
export type MessageResultPageProps = {
	messages: MessageFull[];
	server: ServerPublic;
	channel: ChannelPublicWithFlags;
	thread?: ChannelPublicWithFlags;
	tenant: ServerPublic | undefined;
	requestedId: string;
	isUserInServer: 'in_server' | 'not_in_server';
	relatedPosts: {
		message: MessageFull;
		thread: ChannelPublicWithFlags;
	}[];
	showAIChat?: boolean;
};

const JoinAnswerOverflowCard = () => (
	<div
		className={
			'flex flex-col gap-4 rounded-md border-2 border-solid border-secondary p-4'
		}
	>
		<span
			className={'text-lg font-semibold'}
			style={{
				textWrap: 'balance',
			}}
		>
			Want results from more Discord servers?
		</span>
		<div className={'grid w-full grid-cols-2 gap-4'}>
			<TrackLinkButton
				eventName={'Join Answer Overflow From Message Result Page'}
				eventData={{}}
				variant={'default'}
				target={'_blank'}
				href={'https://app.answeroverflow.com/onboarding'}
			>
				Add your server
			</TrackLinkButton>
			<LazyInviteToAnswerOverflowPopover />
		</div>
	</div>
);

// TODO: Align text to be same level with the avatar
export function MessageResultPage({
	messages,
	server,
	channel,
	thread,
	tenant,
	isUserInServer,
}: MessageResultPageProps) {
	const firstMessage = messages.at(0);
	if (!firstMessage) throw new Error('No message found'); // TODO: Handle this better

	const solutionMessageId = messages.at(0)?.solutions?.at(0)?.id;
	const solution = messages.find((message) => message.id === solutionMessageId);

	let contents = '';
	const messagesWithMergedContent = messages.map((message, index) => {
		if (message.id === firstMessage.id) return null;
		const nextMessage = messages.at(index + 1);
		contents += message.content;
		const isSameAuthor =
			message.author.id === nextMessage?.author.id && message.public;
		const isCollapsible =
			message.attachments.length === 0 &&
			message.embeds?.length === 0 &&
			message.id !== solutionMessageId &&
			message.public;
		const isNextMessageCollapsible =
			nextMessage?.attachments.length === 0 &&
			nextMessage?.embeds?.length === 0 &&
			nextMessage?.id !== solutionMessageId &&
			nextMessage?.public;
		if (isSameAuthor && isCollapsible && isNextMessageCollapsible) {
			contents += '\n';
			return null;
		}
		const mergedContent = contents;
		contents = '';
		return {
			...message,
			content: mergedContent,
		};
	});

	// yes this could be done in one filter but i want the types to be right todo: refactor
	const nonNull = messagesWithMergedContent.filter(Boolean);
	const messagesToDisplay = nonNull.filter((message, index) => {
		if (message.id === firstMessage.id) return false;
		const nextMessage = nonNull.at(index + 1);
		if (!message.public && isUserInServer !== 'in_server') {
			if (nextMessage && !nextMessage.public) {
				return false;
			}
		}
		if (message.author.id === '958907348389339146') return false;
		return true;
	});

	const messageStack = messagesToDisplay
		.map((message) => {
			if (message.id === solutionMessageId) {
				return (
					<div
						className="text-green-700 dark:text-green-400"
						key={message.id}
						id={`solution-${message.id}`}
					>
						Solution
						<div
							className="rounded-lg border-2 border-green-500 p-2 dark:border-green-400"
							key={message.id}
						>
							<ThinMessage message={message} />
						</div>
					</div>
				);
			}

			return (
				<div className="p-2" key={message.id}>
					<ThinMessage message={message} />
				</div>
			);
		})
		.filter(Boolean);

	const title = thread?.name ?? firstMessage.content?.slice(0, 100);
	const firstMessageMedia = firstMessage.attachments
		.filter((attachment) => isImageAttachment(attachment))
		.at(0);

	const Main = () => (
		<main className={'flex w-full max-w-3xl grow flex-col gap-4'}>
			<div className="flex flex-col gap-2 pl-2">
				{tenant ? (
					<div className="flex flex-row items-center gap-2">
						<DiscordAvatar user={firstMessage.author} size={48} />
						<div className="flex flex-col">
							<div className="flex flex-row items-center gap-2">
								<Link
									href={`/u/${firstMessage.author.id}`}
									className="hover:underline"
								>
									{firstMessage.author.name}
								</Link>
								<span className="text-sm text-muted-foreground">•</span>
								<TimeAgo snowflake={firstMessage.id} />
							</div>
						</div>
					</div>
				) : (
					<div className="flex flex-row items-center gap-2">
						<Link href={`/c/${server.id}`}>
							<ServerIcon server={server} size={48} />
						</Link>
						<div className="flex flex-col">
							<div className="flex flex-row items-center gap-2">
								<Link href={`/c/${server.id}`} className="hover:underline">
									{server.name}
								</Link>
								<span className="text-sm text-muted-foreground">•</span>
								<TimeAgo snowflake={firstMessage.id} />
							</div>
							<Link
								href={`/u/${firstMessage.author.id}`}
								className="text-foreground/70 hover:underline"
							>
								{firstMessage.author.name}
							</Link>
						</div>
					</div>
				)}
				<h1 className="text-2xl font-semibold">{title}</h1>
				<div>
					<MessageBody message={firstMessage} loadingStyle="eager" />
					{solution && (
						<div className="mt-4 w-full rounded-lg border-2 border-green-500 p-2 dark:border-green-400">
							<span className="text-green-800 dark:text-green-400">
								Solution:
							</span>

							<MessageBlurrer message={solution}>
								<MessageBody message={solution} collapseContent={true} />
							</MessageBlurrer>

							<JumpToSolution id={solution.id} />
						</div>
					)}
				</div>
			</div>
			<div className="flex flex-row gap-4 border-b-2 border-muted py-4 pl-2">
				<div className={'flex items-center gap-2'}>
					<FaRegMessage className={'size-4'} />
					<span>
						{messagesToDisplay.length}{' '}
						{messagesToDisplay.length === 1 ? 'Reply' : 'Replies'}
					</span>
				</div>
			</div>
			<div className="rounded-md">
				<div className="flex flex-col gap-4">
					<LoadMoreMessages messages={messageStack} />
				</div>
			</div>
			{messagesToDisplay.length === 0 && (
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
			{server.id === '1043890932593987624' && <InKeepWidget server={server} />}
		</main>
	);

	const adsEnabled = !tenant;

	const Sidebar = () => (
		<div className="flex w-full shrink-0 flex-col items-center gap-4 text-center md:w-[400px]">
			<div
				className={
					'hidden w-full rounded-md border-2 bg-card drop-shadow-md md:block'
				}
			>
				<div className="flex flex-col items-start gap-4 p-4">
					<div className="flex w-full flex-row items-center justify-between truncate font-bold">
						<Link href={tenant ? '/' : `/c/${server.id}`}>{server.name}</Link>
						<ServerInviteJoinButton
							server={server}
							channel={channel}
							location={'Message Result Page'}
							size="sm"
							variant={'default'}
							className="rounded-3xl text-xs font-semibold"
						/>
					</div>
					<span className="text-left text-sm">{server.description}</span>
					<div className="flex w-full flex-row items-center justify-between">
						<div className="flex flex-col items-start">
							<span className="text-sm font-semibold">
								<FormattedNumber value={server.approximateMemberCount} />
							</span>
							<span className="text-xs">Members</span>
						</div>
						<Link
							href={getDiscordURLForMessage(firstMessage)}
							className="flex-row-reverse gap-1 text-sm font-semibold"
							icon={<ExternalLink size={16} />}
						>
							View on Discord
						</Link>
					</div>
				</div>
			</div>
			<div className="flex w-full flex-col justify-center gap-2 text-center xl:mt-6">
				{adsEnabled && <CarbonAds />}
				{!tenant && <JoinAnswerOverflowCard />}
			</div>
		</div>
	);
	return (
		<MessageResultPageProvider>
			<div className="mx-auto pt-2">
				<JsonLd<DiscussionForumPosting>
					item={{
						'@context': 'https://schema.org',
						'@type': 'DiscussionForumPosting',
						url: `https://${server.customDomain ?? getMainSiteHostname()}/m/${
							thread?.id ?? firstMessage.id
						}`,
						author: {
							'@type': 'Person',
							name: firstMessage.author.name,
							identifier: firstMessage.author.id,
							url: `/u/${firstMessage.author.id}`,
						},
						image: firstMessageMedia && firstMessageMedia.proxyUrl,
						headline: title,
						articleBody: firstMessage.content,
						datePublished: getDate(firstMessage.id).toISOString(),
						dateModified: thread?.archivedTimestamp
							? new Date(Number(thread.archivedTimestamp)).toISOString()
							: undefined,
						identifier: thread?.id ?? firstMessage.id,
						commentCount: messagesToDisplay.length,
						comment: messagesToDisplay.map((message, index) => ({
							'@type': message.id === solutionMessageId ? 'Answer' : 'Comment',
							text: message.content,
							identifier: message.id,
							datePublished: getDate(message.id).toISOString(),
							position: index + 1,
							author: {
								'@type': 'Person',
								name: message.author.name,
								identifier: message.author.id,
								url: `/u/${message.author.id}`,
							},
						})),
					}}
				/>

				<div className="flex w-full flex-col justify-center gap-4 md:flex-row">
					<Main />
					<Sidebar />
					<TrackLoad
						eventName={'Message Page View'}
						eventData={{
							...channelToAnalyticsData(channel),
							...serverToAnalyticsData(server),
							...(thread && {
								...threadToAnalyticsData(thread),
								'Number of Messages': messages.length,
							}),
							...messageWithDiscordAccountToAnalyticsData(firstMessage),
						}}
					/>
				</div>
			</div>
		</MessageResultPageProvider>
	);
}

export default MessageResultPage;
