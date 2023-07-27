import type {
	ChannelPublicWithFlags,
	APIMessageWithDiscordAccount,
	ServerPublic,
} from '@answeroverflow/api';
import { useIsUserInServer } from '~ui/utils/hooks';
import {
	AOHead,
	Message,
	MultiMessageBlurrer,
	ServerInvite,
	MessageContentWithSolution,
	Heading,
	ServerInviteJoinButton,
} from '../primitives';
import { MessagesSearchBar } from './SearchPage';
import {
	messageWithDiscordAccountToAnalyticsData,
	useTrackEvent,
} from '@answeroverflow/hooks';
import {
	channelToAnalyticsData,
	serverToAnalyticsData,
	threadToAnalyticsData,
} from '@answeroverflow/constants/src/analytics';
import { isServer } from '~ui/utils/checks';
import Head from 'next/head';
import type { QAPage, WithContext } from 'schema-dts';
import { getMainSiteHostname } from '@answeroverflow/constants/src/links';
import { toHTML } from 'discord-markdown';
export type MessageResultPageProps = {
	messages: APIMessageWithDiscordAccount[];
	server: ServerPublic;
	channel: ChannelPublicWithFlags;
	thread?: ChannelPublicWithFlags;
	requestedId: string;
};

// TODO: Align text to be same level with the avatar
export function MessageResultPage({
	messages,
	server,
	channel,
	requestedId,
	thread,
}: MessageResultPageProps) {
	const isUserInServer = useIsUserInServer(server.id);
	const firstMessage = messages.at(0);
	if (!firstMessage) throw new Error('No message found'); // TODO: Handle this better
	const channelName = thread?.name ?? channel.name;
	const description =
		firstMessage && firstMessage.content?.length > 0
			? firstMessage.content
			: `Questions related to ${channelName} in ${server.name}`;
	const shouldTrackAnalyticsEvent = isUserInServer !== 'loading' && !isServer();

	// TODO: Ugly
	useTrackEvent(
		'Message Page View',
		{
			...channelToAnalyticsData(channel),
			...serverToAnalyticsData(server),
			...(thread && {
				...threadToAnalyticsData(thread),
				'Number of Messages': messages.length,
			}),
			...messageWithDiscordAccountToAnalyticsData(firstMessage),
		},
		{
			runOnce: true,
			enabled: shouldTrackAnalyticsEvent,
		},
	);
	const solutionMessageId = messages.at(0)?.solutionIds?.at(0);
	const solution = messages.find((message) => message.id === solutionMessageId);
	let consecutivePrivateMessages = 0;

	let contents = '';
	const messagesWithMergedContent = messages.map((message, index) => {
		const nextMessage = messages.at(index + 1);
		contents += message.content;
		const isSameAuthor =
			message.author.id === nextMessage?.author.id && message.public;
		const isCollapsible =
			message.attachments.length === 0 &&
			message.id !== solutionMessageId &&
			message.public;
		if (isSameAuthor && isCollapsible) {
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

	const messagesToDisplay = messagesWithMergedContent.filter(Boolean);

	const messageStack = messagesToDisplay.map((message, index) => {
		const nextMessage = messagesToDisplay.at(index + 1);
		if (!message.public && isUserInServer !== 'in_server') {
			consecutivePrivateMessages++;
			if (nextMessage && !nextMessage.public) {
				return;
			}
		} else {
			consecutivePrivateMessages = 0;
		}
		// TODO: Remove when embeds are supported
		if (
			(message.public || isUserInServer === 'in_server') &&
			message.content.length === 0 &&
			message.attachments.length === 0
		)
			return null;

		const Msg = ({ count }: { count: number }) => {
			const shouldShowSolutionInContent = index === 0 && solution;

			return (
				<Message
					key={message.id}
					message={message}
					fullRounded
					content={
						shouldShowSolutionInContent ? (
							<MessageContentWithSolution
								solution={{
									message: solution,
								}}
								showJumpToSolutionCTA
							/>
						) : undefined
					}
					showBorders={message.id !== solutionMessageId}
					images={shouldShowSolutionInContent ? null : undefined}
					loadingStyle={index === 0 ? 'eager' : 'lazy'} // Images above the fold should have priority
					Blurrer={(props) => <MultiMessageBlurrer {...props} count={count} />}
				/>
			);
		};

		if (message.id === solutionMessageId) {
			return (
				<div
					className="text-green-700 dark:text-green-400"
					key={message.id}
					id={`solution-${message.id}`}
				>
					Solution
					<div
						className="rounded-lg border-2 border-green-500  dark:border-green-400 "
						key={message.id}
					>
						<Msg key={message.id} count={consecutivePrivateMessages} />
					</div>
				</div>
			);
		}

		return <Msg key={message.id} count={consecutivePrivateMessages} />;
	});

	const question = thread?.name ?? firstMessage.content?.slice(0, 100);

	const qaHeader: WithContext<QAPage> = {
		'@context': 'https://schema.org',
		'@type': 'QAPage',
		mainEntity: {
			'@type': 'Question',
			name: toHTML(question),
			text: toHTML(firstMessage.content),
			answerCount: solution ? 1 : 0,
			acceptedAnswer: solution && {
				'@type': 'Answer',
				text: toHTML(solution.content),
				url: `https://${server.customDomain ?? getMainSiteHostname()}/m/${
					solution.id
				}#solution-${solution.id}`,
			},
		},
	};

	return (
		<div className="sm:mx-3">
			<Head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(qaHeader) }}
				/>
			</Head>
			<AOHead
				description={description}
				path={`/m/${firstMessage?.id ?? requestedId}`}
				title={`${channelName} - ${server.name}`}
				server={server}
			/>

			<div className="mb-2 flex flex-col-reverse items-center justify-between gap-2 sm:flex-row sm:py-0 md:my-8">
				<div className="flex h-full w-full grow flex-col items-center justify-between gap-2 md:gap-4">
					<MessagesSearchBar className={'hidden md:block'} />
					<div className={'block md:hidden'}>
						<ServerInvite
							server={server}
							location={'Message Result Page'}
							channel={channel}
							JoinButton={null}
						/>
					</div>
					<div className="flex w-full flex-row items-center justify-start rounded-sm border-b-2 border-solid border-neutral-400  text-center  dark:border-neutral-600 dark:text-white">
						<h1
							className="w-full text-center font-header text-xl text-primary md:text-left md:text-3xl"
							dangerouslySetInnerHTML={{ __html: toHTML(question) }}
						></h1>
					</div>
				</div>
				<div className="hidden shrink-0 sm:pl-8 md:block">
					<ServerInvite
						server={server}
						channel={channel}
						location="Message Result Page"
					/>
				</div>
			</div>
			<div className="rounded-md">
				<div className="flex flex-col gap-4">{messageStack}</div>
			</div>
			<div className="mt-4 flex flex-col items-center justify-center gap-4 text-center">
				<Heading.H2 className={'text-lg md:text-2xl'}>
					Looking for more? Join the community!
				</Heading.H2>
				<div className={'w-full max-w-[300px]'}>
					<ServerInvite
						server={server}
						channel={channel}
						location="Message Result Page"
					/>
				</div>
			</div>
		</div>
	);
}

export default MessageResultPage;
