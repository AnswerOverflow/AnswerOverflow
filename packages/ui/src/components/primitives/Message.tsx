// This component file is based off - https://www.youtube.com/watch?v=vPRdY87_SH0
import type { APIMessageWithDiscordAccount } from '@answeroverflow/api';
import discordMarkdown from 'discord-markdown';
import Parser from 'html-react-parser';
import Image from 'next/image';
import { createContext, useContext } from 'react';
import { DiscordAvatar } from './DiscordAvatar';
import { useIsUserInServer } from '~ui/utils/hooks';
import { getSnowflakeUTCDate } from '~ui/utils/snowflake';
import { cn } from '~ui/utils/styling';

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

export const MessageAuthorArea = () => {
	const { message } = useMessageContext();
	return (
		<div className="flex w-full min-w-0 gap-2">
			{/* TODO: sort out responsive styling */}
			<div className="flex w-full flex-row items-center gap-2 font-body text-lg text-black/[.7] dark:text-white/[.47]">
				<DiscordAvatar user={message.author} size="sm" />
				<span className="mr-1">{message.author.name}</span>
				<span className="ml-auto">{getSnowflakeUTCDate(message.id)}</span>
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

export const MessageAttachments = ({
	setOpen,
	setAttachment,
}: {
	setOpen?: (open: boolean) => void;
	setAttachment?: (
		attachment: APIMessageWithDiscordAccount['attachments'][number],
	) => void;
}) => {
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
				<img
					className="max-w-full cursor-zoom-in py-4 md:max-w-sm"
					src={attachment.url}
					style={{
						width: 'fit-content',
						height: 'auto',
						objectFit: 'cover',
					}}
					alt={attachment.description ? attachment.description : 'Image'}
					onClick={() => {
						setOpen?.(true);
						setAttachment?.(attachment);
					}}
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
				className="cursor-zoom-in py-4"
				onClick={() => {
					setOpen?.(true);
					setAttachment?.(attachment);
				}}
				alt={attachment.description ? attachment.description : 'Image'}
				style={{
					maxWidth: `${width}px`,
					maxHeight: `${maxHeight}px`,
					aspectRatio: `${aspectRatio}`,
				}}
			/>
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
	setOpen?: (open: boolean) => void;
	setAttachment?: (
		attachment: APIMessageWithDiscordAccount['attachments'][number],
	) => void;
};

export const Message = ({
	message,
	setOpen,
	setAttachment,
	Blurrer = MessageBlurrer,
	showBorders,
	content = <MessageContents />,
	authorArea = <MessageAuthorArea />,
	images = (
		<MessageAttachments setOpen={setOpen} setAttachment={setAttachment} />
	),
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
