import type { MessageWithDiscordAccount } from '@answeroverflow/db';
import React from 'react';
import { DiscordAvatar } from '../discord-avatar';
import { getSnowflakeUTCDate } from '../utils/snowflake';
import { cn } from '../utils/utils';
import { messageWithDiscordAccountToAnalyticsData } from '@answeroverflow/hooks/src/analytics/events';
import { getDiscordURLForMessage } from '../utils/discord';
import Link from '../ui/link';
import { DiscordIcon } from '../icons';
import { fetchIsUserInServer } from '../utils/fetch-is-user-in-server';
import { MessageProps } from './props';
import { MessageAttachments } from './attachments';
import { TrackLinkButton } from '../ui/track-link-button';
import { parse } from './markdown/render';
import { Embed } from './Embed';
import { BlueLink } from '../ui/blue-link';

export const MessageAuthorArea = (props: Pick<MessageProps, 'message'>) => {
	const { message } = props;
	return (
		<div className="flex w-full min-w-0 gap-2">
			{/* TODO: sort out responsive styling */}
			<div className="flex w-full flex-row items-center gap-2 font-body text-lg text-black/[.7] dark:text-white/[.47]">
				<DiscordAvatar user={message.author} size={40} />
				<Link className="mr-1" href={`/u/${message.author.id}`}>
					<span className="text-black/[.7] hover:underline dark:text-white/[.47]">
						{message.author.name}
					</span>
				</Link>
				<div className="ml-auto mr-4 flex flex-row gap-2">
					<TrackLinkButton
						href={getDiscordURLForMessage(message)}
						eventName={'View On Discord Click'}
						eventData={messageWithDiscordAccountToAnalyticsData(message)}
						className="h-8 w-8 bg-transparent p-1 hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
					>
						<DiscordIcon className="h-8 w-8" color="primary" />
						<span className="sr-only">View on Discord</span>
					</TrackLinkButton>
				</div>
				<span>{getSnowflakeUTCDate(message.id)}</span>
			</div>
		</div>
	);
};

const DEFAULT_COLLAPSE_CONTENT_LENGTH = 500;

export const MessageContents = async (
	props: Pick<MessageProps, 'collapseContent' | 'message'> & {
		className?: string;
	},
) => {
	const { message, collapseContent } = props;

	const collapseBy =
		typeof collapseContent === 'number'
			? collapseContent
			: DEFAULT_COLLAPSE_CONTENT_LENGTH;

	const shouldCollapse =
		collapseContent !== false &&
		collapseContent !== undefined &&
		(message.content.length > collapseBy ||
			(message.content.match(/\n/g)?.length ?? 0 > 5));
	const trimmedText = shouldCollapse
		? (message.content.match(/\n/g)?.length ?? 0 > 5)
			? message.content.split('\n').slice(0, 5).join('\n') + '...'
			: `${message.content.slice(0, collapseBy).trim()}...`
		: message.content;
	const discordMarkdownAsHTML = await parse(trimmedText);
	return (
		<div
			className={cn(
				'max-w-4xl whitespace-break-spaces pt-2 font-body text-primary [overflow-wrap:_anywhere]',
				props.className,
			)}
		>
			{discordMarkdownAsHTML}
		</div>
	);
};

export const MessageEmbeds = (props: { message: MessageProps['message'] }) => {
	if (props.message.embeds?.length === 0) return null;

	return (
		<div className="mt-2 flex w-full flex-col gap-2">
			{props.message.embeds?.map((embed, embedIteration) => (
				<Embed embed={embed} key={`embed-${embedIteration}`} />
			))}
		</div>
	);
};

export const MessageContentWithSolution = (
	props: Pick<MessageProps, 'collapseContent' | 'message' | 'loadingStyle'> & {
		solution: MessageWithDiscordAccount;
		showJumpToSolutionCTA?: boolean;
	},
) => {
	return (
		<div>
			<MessageContents {...props} />
			<div className="mt-4 w-full rounded-lg border-2 border-green-500 p-2 dark:border-green-400">
				<span className="text-green-800 dark:text-green-400">Solution:</span>
				<MessageBlurrer message={props.solution}>
					<MessageContents message={props.solution} collapseContent={true} />
				</MessageBlurrer>
				{props.showJumpToSolutionCTA && (
					<BlueLink href={`#solution-${props.solution.id}`}>
						Jump to solution
					</BlueLink>
				)}
			</div>
		</div>
	);
};

export const MessageBody = (
	props: MessageProps & {
		content?: React.ReactNode;
	},
) => {
	return (
		<div className="flex flex-col gap-2">
			{props.content ? props.content : <MessageContents {...props} />}
			<MessageEmbeds {...props} />
			<MessageAttachments {...props} />
		</div>
	);
};

export const Message = (
	props: MessageProps & {
		content?: React.ReactNode;
	},
) => {
	return (
		<MessageBlurrer {...props} blurCount={props.numberOfMessages}>
			<div
				className={cn(
					`discord-message w-full ${
						props.showBorders ? 'border-2 border-foreground' : ''
					} border-black/[.13] dark:border-white/[.13] ${
						props.fullRounded ? 'rounded-standard' : 'lg:rounded-tl-standard'
					}`,
					props.className,
				)}
			>
				<div className="flex flex-col p-6">
					<div className="flex items-center gap-2">
						<MessageAuthorArea {...props} />
					</div>
					{props.content ? props.content : <MessageContents {...props} />}
					<MessageEmbeds {...props} />
					<MessageAttachments {...props} />
				</div>
			</div>
		</MessageBlurrer>
	);
};

export async function canViewMessage(message: MessageWithDiscordAccount) {
	const inServer = await fetchIsUserInServer(message.serverId);
	return message.public || inServer === 'in_server';
}

export async function MessageBlurrer({
	children,
	message,
	blurCount = 1,
}: {
	children: React.ReactNode;
	message: MessageWithDiscordAccount;
	blurCount?: number;
}) {
	const skipBlur = await canViewMessage(message);
	// We must hide backdrop blur to prevent the border around the message from being blurred as well - causes weird color change
	if (blurCount > 1) {
		return (
			<ContentBlurrer
				blurred={!skipBlur}
				hideBackdropBlur
				notPublicTitle={`${blurCount} Messages Not Public`}
			>
				{children}
			</ContentBlurrer>
		);
	}
	return (
		<ContentBlurrer blurred={!skipBlur} hideBackdropBlur>
			{children}
		</ContentBlurrer>
	);
}

export const ContentBlurrer = ({
	blurred,
	children,
	hideBackdropBlur,
	notPublicTitle = 'Message Not Public',
	notPublicInstructions = 'Sign In & Join Server To View',
}: {
	blurred: boolean;
	notPublicTitle?: string;
	children: React.ReactNode;
	notPublicInstructions?: string;
	hideBackdropBlur?: boolean;
}) => {
	const blurAmount = '.4rem';

	if (!blurred) {
		return <>{children}</>;
	}

	return (
		<div className="relative w-full text-primary">
			<div
				style={{
					filter: `blur(${blurAmount})`,
					backdropFilter: `${hideBackdropBlur ? '' : `blur(${blurAmount})`}`,
					WebkitBackdropFilter: `${
						hideBackdropBlur ? '' : `blur(${blurAmount})`
					}`,
					WebkitFilter: `blur(${blurAmount})`,
					msFilter: `blur(${blurAmount})`,
				}}
				className="select-none"
				tabIndex={-1}
			>
				{children}
			</div>
			<div>
				<div className="absolute inset-0" />
				<div className="absolute inset-0 flex items-center justify-center">
					<div
						className={`flex flex-col items-center justify-center rounded-standard text-center backdrop-blur-sm`}
					>
						<div className="text-2xl">{notPublicTitle}</div>
						<div>{notPublicInstructions}</div>
					</div>
				</div>
			</div>
		</div>
	);
};
