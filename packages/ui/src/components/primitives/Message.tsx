// This component file is based off - https://www.youtube.com/watch?v=vPRdY87_SH0
import type { APIMessageWithDiscordAccount } from '@answeroverflow/api';
import discordMarkdown from 'discord-markdown';
import Parser from 'html-react-parser';
import Image from 'next/image';
import React, { createContext, useContext, useState } from 'react';
import { DiscordAvatar } from './DiscordAvatar';
import { useIsUserInServer } from '~ui/utils/hooks';
import { getSnowflakeUTCDate } from '~ui/utils/snowflake';
import { cn } from '~ui/utils/styling';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { LinkButton, Button } from './base';
import { useCopyToClipboard } from 'react-use';

// eslint-disable-next-line @typescript-eslint/naming-convention
const MessageContext = createContext<{
	message: APIMessageWithDiscordAccount;
} | null>(null);

export function useMessageContext() {
	const context = useContext(MessageContext);
	if (!context) {
		throw new Error(
			'This component must be rendered as a child of Message component',
		);
	}
	return context;
}

const CopyIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-4 w-4"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
			/>
		</svg>
	);
};

const ExternalLinkIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-4 w-4"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
			/>
		</svg>
	);
};

export const MessageAuthorArea = () => {
	const [copyStatus, copyToClipboard] = useCopyToClipboard();
	const { message } = useMessageContext();

	return (
		<div className="flex w-full min-w-0 gap-2">
			{/* TODO: sort out responsive styling */}
			<div className="flex w-full flex-row items-center gap-2 font-body text-lg text-black/[.7] dark:text-white/[.47]">
				<DiscordAvatar user={message.author} size="sm" />
				<span className="mr-1">{message.author.name}</span>
				<div className="mr-4 ml-auto flex flex-row gap-2">
					<LinkButton
						href={`https://discord.com/${message.serverId}/${message.id}`}
						className="p-1"
					>
						<ExternalLinkIcon />
					</LinkButton>

					<Button
						className="p-1"
						onClick={() =>
							copyToClipboard(
								`https://discord.com/${message.serverId}/${message.id}`,
							)
						}
					>
						<CopyIcon />
					</Button>
				</div>
				<span>{getSnowflakeUTCDate(message.id)}</span>
			</div>
		</div>
	);
};

export const MessageContents = () => {
	const { message } = useMessageContext();
	const { toHTML } = discordMarkdown;
	const convertedMessageContent = toHTML(message.content);
	const parsedMessageContent = Parser(convertedMessageContent);
	return (
		<div className="pt-2 font-body text-ao-black [word-wrap:_break-word] dark:text-ao-white">
			{parsedMessageContent}
		</div>
	);
};

const CloseIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-6 w-6"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M6 18L18 6M6 6l12 12"
			/>
		</svg>
	);
};

export const MessageModalWrapper = ({
	children,
	attachment,
}: React.PropsWithChildren<{
	attachment: APIMessageWithDiscordAccount['attachments'][number];
}>) => {
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

	return (
		<AlertDialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
			<AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
			<AlertDialog.Portal>
				<AlertDialog.Overlay className="fixed inset-0 z-50 flex h-full w-full items-center justify-center bg-black/75" />
				<AlertDialog.Content className="fixed top-0 left-0 z-[75] flex h-full w-full flex-col items-center justify-center p-4">
					<div className="absolute top-0 right-0 z-[100] p-2">
						<AlertDialog.Cancel className="flex h-8 w-8 items-center justify-center rounded-full bg-white transition-colors duration-200 focus:outline-none focus:ring focus:ring-gray-300 hover:bg-gray-200 dark:bg-black dark:hover:bg-gray-800">
							<CloseIcon />
						</AlertDialog.Cancel>
					</div>
					<img
						className="max-h-vh80 w-full max-w-2xl object-contain lg:h-full xl:p-10"
						src={attachment?.url}
						alt={attachment?.description ?? 'Image'}
					/>
				</AlertDialog.Content>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
};

export const MessageAttachments = () => {
	const { message } = useMessageContext();
	function MessageImage({
		attachment,
	}: {
		attachment: APIMessageWithDiscordAccount['attachments'][number];
	}) {
		let width = attachment.width;
		let height = attachment.height;
		const maxWidth = 400;
		const maxHeight = 300;

		if (!width || !height)
			return (
				// TODO: Bit of a hack for now since next images don't work well with no w/h specified
				// eslint-disable-next-line @next/next/no-img-element
				<MessageModalWrapper attachment={attachment}>
					<img
						className="max-w-full cursor-zoom-in py-4 md:max-w-sm"
						src={attachment.url}
						style={{
							width: 'fit-content',
							height: 'auto',
							objectFit: 'cover',
						}}
						alt={attachment.description ? attachment.description : 'Image'}
					/>
				</MessageModalWrapper>
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
			<MessageModalWrapper attachment={attachment}>
				<Image
					key={attachment.url}
					src={attachment.url}
					width={originalWidth}
					height={originalHeight}
					className="cursor-zoom-in py-4"
					alt={attachment.description ? attachment.description : 'Image'}
					style={{
						maxWidth: `${width}px`,
						maxHeight: `${maxHeight}px`,
						aspectRatio: `${aspectRatio}`,
					}}
				/>
			</MessageModalWrapper>
		);
	}
	return (
		<div className="grid gap-2">
			{message.attachments.map((attachment) => (
				<MessageImage key={attachment.id} attachment={attachment} />
			))}
		</div>
	);
};

type MessageProps = {
	message: APIMessageWithDiscordAccount;
	avatar?: React.ReactNode;
	content?: React.ReactNode;
	authorArea?: React.ReactNode;
	images?: React.ReactNode;
	showBorders?: boolean;
	Blurrer?: React.FC<{ children: React.ReactNode }>;
	className?: string;
	fullRounded?: boolean;
};

export const Message = ({
	message,
	Blurrer = MessageBlurrer,
	showBorders,
	content = <MessageContents />,
	authorArea = <MessageAuthorArea />,
	images = <MessageAttachments />,
	className,
	fullRounded,
}: MessageProps) => {
	return (
		<MessageContext.Provider value={{ message }}>
			<Blurrer>
				<div
					className={cn(
						`grow bg-[#E9ECF2] dark:bg-[#181B1F] ${
							showBorders ? 'border-2' : ''
						} border-black/[.13] dark:border-white/[.13] ${
							fullRounded ? 'rounded-standard' : 'lg:rounded-tl-standard'
						}`,
						className,
					)}
				>
					<div className="p-6">
						<div className="flex items-center gap-2">{authorArea}</div>
						{content}
						{images}
					</div>
				</div>
			</Blurrer>
		</MessageContext.Provider>
	);
};

export function useCanViewMessage(message: APIMessageWithDiscordAccount) {
	const isUserInServer = useIsUserInServer(message.serverId);
	if (isUserInServer === 'loading' && !message.public) return false;
	return message.public || isUserInServer;
}

export function MessageBlurrer({ children }: { children: React.ReactNode }) {
	const { message } = useMessageContext();
	const canViewMessage = useCanViewMessage(message);
	// We must hide backdrop blur to prevent the border around the message from being blurred as well - causes weird color change
	return (
		<ContentBlurrer blurred={!canViewMessage} hideBackdropBlur>
			{children}
		</ContentBlurrer>
	);
}

export function MultiMessageBlurrer(props: {
	children: React.ReactNode;
	count: number;
}) {
	const { count, children } = props;
	const { message } = useMessageContext();
	const canViewMessage = useCanViewMessage(message);
	// We must hide backdrop blur to prevent the border around the message from being blurred as well - causes weird color change
	return (
		<ContentBlurrer
			blurred={!canViewMessage}
			hideBackdropBlur
			notPublicTitle={
				count === 1 ? 'Message Not Public' : `${count} Messages Not Public`
			}
		>
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
		<div className="relative">
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
				<div className="absolute inset-0 " />
				<div className="absolute inset-0 flex items-center justify-center ">
					<div
						className={`flex flex-col items-center justify-center rounded-standard bg-ao-white/25 p-5 text-center text-ao-black backdrop-blur-sm dark:bg-ao-black/75 dark:text-ao-white`}
					>
						<div className="text-2xl">{notPublicTitle}</div>
						<div>{notPublicInstructions}</div>
					</div>
				</div>
			</div>
		</div>
	);
};
