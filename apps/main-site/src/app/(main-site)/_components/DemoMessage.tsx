import { getSnowflakeUTCDate } from '@answeroverflow/ui/src/utils/snowflake';
import Image from 'next/image';
import type { MessageWithDiscordAccount } from '@answeroverflow/db';
import {
	Avatar,
	AvatarImage,
	AvatarFallback,
} from '@answeroverflow/ui/src/ui/avatar';
import Link from '@answeroverflow/ui/src/ui/link';
import type { ChannelPublicWithFlags } from '@answeroverflow/db';
import { forwardRef } from 'react';
import { getInitials } from '@answeroverflow/ui/src/utils/avatars';
import { DiscordIcon } from '@answeroverflow/ui/src/icons';
export type MessageProps = {
	message: MessageWithDiscordAccount;
	thread?: ChannelPublicWithFlags;
	blurred?: boolean;
	notPublicTitle?: string;
	forceDarkMode?: boolean;
	showLinkIcon?: boolean;
	/**
	 * @example "Today at 13:51"
	 */
	customMessageDateString?: string;
	ref?: React.Ref<HTMLDivElement>;
	/**
	 * Any additional classes to add to the message box
	 */
	additionalMessageBoxClassNames?: string;
	alt: string;
	src: string;
};

// TODO: Align text to be same level with the avatar
export const DemoMessage = forwardRef<HTMLDivElement, MessageProps>(
	function MessageComp(
		{
			message,
			thread,
			blurred = false,
			notPublicTitle = 'Message Not Public',
			forceDarkMode = false,
			showLinkIcon = true,
			customMessageDateString,
			additionalMessageBoxClassNames,
			alt,
			src,
		},
		ref,
	) {
		const dateOfMessage = customMessageDateString
			? customMessageDateString
			: getSnowflakeUTCDate(message.id);
		blurred = false;

		function MessageAttachment({
			attachment,
		}: {
			attachment: MessageWithDiscordAccount['attachments'][number];
		}) {
			if (!attachment.contentType?.startsWith('image/')) return null;
			let width = attachment.width;
			let height = attachment.height;
			const maxWidth = 400;
			const maxHeight = 300;

			if (!width || !height)
				return (
					// TODO: Bit of a hack for now since next images don't work well with no w/h specified
					// eslint-disable-next-line @next/next/no-img-element
					<img
						className="max-w-full md:max-w-sm"
						src={attachment.url}
						style={{
							width: 'fit-content',
							height: 'auto',
							objectFit: 'cover',
						}}
						alt={attachment.description ? attachment.description : 'Image'}
					/>
				);
			const originalWidth = width;
			const originalHeight = height;
			if (width > height) {
				width = maxWidth;
				height = (maxWidth / originalWidth) * originalHeight;
			} else {
				height = maxHeight;
				width = (maxHeight / originalHeight) * originalWidth;
			}

			const aspectRatio = width / height;
			return (
				<Image
					key={attachment.url}
					src={attachment.url}
					width={originalWidth}
					height={originalHeight}
					alt={attachment.description ? attachment.description : 'Image'}
					style={{
						maxWidth: `${width}px`,
						maxHeight: `${maxHeight}px`,
						aspectRatio: `${aspectRatio}`,
					}}
				/>
			);
		}

		function getMessageUrl({
			serverId,
			channelId,
			messageId,
			threadId,
		}: {
			serverId: string;
			channelId: string;
			messageId: string;
			threadId?: string;
		}) {
			const endpoint = `${serverId}/${channelId}/${
				threadId ? threadId + '/' : ''
			}${messageId}`;
			return `discord://discord.com/channels/${endpoint}`;
		}

		const Contents = (props: { alt: string; src: string }) => (
			<div className="flex w-full flex-col items-start justify-center">
				<div className="group relative flex w-full break-words rounded-xl p-1">
					<div className="mr-4 hidden shrink-0 sm:block">
						<Avatar>
							<AvatarImage alt={props.alt} src={props.src} />
							<AvatarFallback>{getInitials(props.alt)}</AvatarFallback>
						</Avatar>
					</div>
					<div className="w-full">
						<div className="flex w-full min-w-0 justify-between">
							<div className="flex min-w-0 gap-2">
								<div className="shrink-0 sm:hidden">
									<Avatar>
										<AvatarImage alt={props.alt} src={props.src} />
										<AvatarFallback>{getInitials(props.alt)}</AvatarFallback>
									</Avatar>
								</div>
								<div className="flex flex-col sm:flex-row">
									<span
										className={`mr-1 text-black ${
											forceDarkMode ? 'text-white' : 'dark:text-white'
										}`}
									>
										{message.author.name}
									</span>
									<span
										className={`ml-[0.25rem] flex items-center justify-center text-[0.75rem] text-[hsl(213,_9.6%,_40.8%)] ${
											forceDarkMode
												? 'text-[hsl(216,_3.7%,_73.5%)]'
												: 'dark:text-[hsl(216,_3.7%,_73.5%)]'
										}`}
									>
										{dateOfMessage}
									</span>
								</div>
							</div>
							{/* TODO: Improve styling */}
							{showLinkIcon && (
								<Link
									href={getMessageUrl({
										serverId: message.serverId,
										channelId:
											thread && thread.parentId
												? thread.parentId
												: message.channelId,
										messageId: message.id,
										threadId: thread?.id,
									})}
									className="absolute right-0 h-6 w-6 group-hover:visible"
									aria-label="Open in Discord"
								>
									<DiscordIcon color="blurple" />
								</Link>
							)}
						</div>
						<div
							className={`mt-2 max-w-[80vw] text-black ${
								forceDarkMode ? 'text-neutral-50' : 'dark:text-neutral-50'
							} sm:mt-0 sm:max-w-[70vw] md:max-w-full`}
						>
							{message.content}
						</div>
						<div className="grid gap-2">
							{message.attachments.map((attachment) => (
								<MessageAttachment
									key={attachment.id}
									attachment={attachment}
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		);

		const blurAmount = '.4rem';

		return (
			<div
				className={`relative h-full w-full p-2 ${
					additionalMessageBoxClassNames ?? ''
				} ${forceDarkMode ? 'bg-[#36393F]' : 'dark:bg-[#36393F]'}`}
				ref={ref}
			>
				{blurred ? (
					<>
						<div
							style={{
								filter: `blur(${blurAmount})`,
								backdropFilter: `blur(${blurAmount})`,
								WebkitBackdropFilter: `blur(${blurAmount})`,
								WebkitFilter: `blur(${blurAmount})`,
								msFilter: `blur(${blurAmount})`,
							}}
						>
							<Contents alt={alt} src={src} />
						</div>
						<div>
							<div className="absolute inset-0" />
							<div className="absolute inset-0 flex items-center justify-center">
								<div
									className={`flex flex-col items-center justify-center text-center text-black ${
										forceDarkMode ? 'text-white' : 'dark:text-white'
									}`}
								>
									<div className="text-2xl">{notPublicTitle}</div>
									<div>Sign In & Join Server To View</div>
								</div>
							</div>
						</div>
					</>
				) : (
					<Contents alt={alt} src={src} />
				)}
			</div>
		);
	},
);
