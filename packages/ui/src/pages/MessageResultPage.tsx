import type { ChannelPublicWithFlags, MessageFull } from '@answeroverflow/db';
import type { ServerPublic } from '@answeroverflow/api';
import type { DiscussionForumPosting, WithContext } from 'schema-dts';
import { ServerInviteJoinButton } from '../server-invite';
import { MessageBody, MessageContentWithSolution } from '../message/Message';
import Link from '../ui/link';
import { TrackLoad } from '../ui/track-load';
import {
	channelToAnalyticsData,
	serverToAnalyticsData,
	threadToAnalyticsData,
} from '@answeroverflow/constants/src/analytics';
import { messageWithDiscordAccountToAnalyticsData } from '@answeroverflow/hooks';
import { stripMarkdownAndHTML } from '../message/markdown/strip';
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
};

const JoinAnswerOverflowCard = () => (
	<div
		className={
			'flex flex-col gap-4 rounded-md border-2 border-solid border-secondary p-4'
		}
	>
		<span
			className={'text-lg font-semibold '}
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
	relatedPosts,
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
							className="rounded-lg border-2 border-green-500  p-2 dark:border-green-400"
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
	const qaHeader: WithContext<DiscussionForumPosting> = {
		'@context': 'https://schema.org',
		'@type': 'DiscussionForumPosting',
		url: `https://${server.customDomain ?? getMainSiteHostname()}/m/${
			thread?.id ?? firstMessage.id
		}`,
		author: {
			'@type': 'Person',
			name: stripMarkdownAndHTML(firstMessage.author.name),
		},
		headline: stripMarkdownAndHTML(title),
		articleBody: stripMarkdownAndHTML(firstMessage.content),
		// TODO: Add author
		datePublished: getDate(firstMessage.id).toISOString(),
		dateModified: thread?.archivedTimestamp
			? new Date(Number(thread.archivedTimestamp)).toISOString()
			: undefined,
		identifier: thread?.id ?? firstMessage.id,
		commentCount: messagesToDisplay.length,
		comment: messagesToDisplay.map((message) => ({
			'@type': message.id === solutionMessageId ? 'Answer' : 'Comment',
			text: stripMarkdownAndHTML(message.content),
			datePublished: getDate(message.id).toISOString(),
			author: {
				'@type': 'Person',
				name: stripMarkdownAndHTML(message.author.name),
			},
		})),
	};
	const Main = () => (
		<main className={'flex w-full grow flex-col gap-4'}>
			<div className="flex flex-col gap-2 pl-2">
				{!tenant && (
					<div className="flex flex-row items-center gap-2">
						<Link href={`/c/${server.id}`}>
							<ServerIcon server={server} size={48} />
						</Link>
						<div className="flex flex-col">
							<Link href={`/c/${server.id}`}>{server.name}</Link>
							{firstMessage.author.name}
						</div>
					</div>
				)}
				<h1 className="text-2xl font-semibold">{title}</h1>
				<div>
					<MessageBody
						message={firstMessage}
						content={
							solution &&
							messageStack.length > 2 && (
								<MessageContentWithSolution
									message={firstMessage}
									solution={solution}
								/>
							)
						}
						loadingStyle="eager"
					/>
				</div>
			</div>
			<div className="rounded-md">
				<div className="flex flex-col gap-4">{messageStack}</div>
			</div>
		</main>
	);

	const adsEnabled = !tenant;

	const Sidebar = () => (
		<div className="flex w-full shrink-0 flex-col items-center gap-4 text-center  md:w-[400px]">
			<div
				className={
					'hidden w-full rounded-md border-2 bg-card drop-shadow-md md:block'
				}
			>
				<div className="flex flex-col items-start gap-4 p-4">
					<div className="flex w-full flex-row items-center justify-between truncate font-bold">
						<Link href={`/c/${server.id}`}>{server.name}</Link>
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
						<div className="flex flex-col items-start ">
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
			<div className="flex w-full flex-col justify-center gap-2 text-center xl:mt-6 ">
				{adsEnabled && <CarbonAds />}
				{!tenant && <JoinAnswerOverflowCard />}
				{relatedPosts.length > 0 && (
					<>
						<span className="text-lg font-semibold">More Posts</span>
						<div className="flex flex-col gap-4">
							{relatedPosts.slice(0, messages.length * 2).map((post) => (
								<Link
									className="flex flex-col gap-2 rounded-md border-2 border-solid border-secondary p-4 text-left transition-colors duration-700 ease-out hover:border-primary hover:text-primary"
									href={`/m/${post.message.id}`}
									key={post.thread.id}
								>
									<span className="truncate text-lg font-semibold">
										{post.thread.name}
									</span>
									<span className="truncate text-sm">
										{post.message.content.slice(0, 100)}
									</span>
								</Link>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
	const rendered = (
		<div className="mx-auto pt-2">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(qaHeader) }}
			/>
			<div className="flex flex-col gap-4 md:flex-row">
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
	);
	return rendered;
}

export default MessageResultPage;
