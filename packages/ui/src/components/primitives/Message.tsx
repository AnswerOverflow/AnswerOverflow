// This component file is based off - https://www.youtube.com/watch?v=vPRdY87_SH0
import type { APIMessageWithDiscordAccount } from '@answeroverflow/api';
import discordMarkdown from 'discord-markdown';
import Image from 'next/image';
import React, { createContext, useContext, useState } from 'react';
import { DiscordAvatar } from './DiscordAvatar';
import { useIsUserInServer } from '~ui/utils/hooks';
import { getSnowflakeUTCDate } from '~ui/utils/snowflake';
import { cn } from '~ui/utils/styling';
import { LinkButton, DiscordIcon } from './base';
import {
	trackEvent,
	messageWithDiscordAccountToAnalyticsData,
} from '@answeroverflow/hooks';
import { getDiscordURLForMessage } from '~ui/utils/discord';
import { type Image as ImageType } from 'react-grid-gallery';
import { useEffect } from 'react';
import { type Slide } from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { getImageHeightWidth } from '~ui/utils/other';

// eslint-disable-next-line @typescript-eslint/naming-convention
const MessageContext = createContext<
	| ({
			message: APIMessageWithDiscordAccount;
	  } & Partial<MessageProps>)
	| null
>(null);

export function useMessageContext() {
	const context = useContext(MessageContext);
	if (!context) {
		throw new Error(
			'This component must be rendered as a child of Message component',
		);
	}
	return context;
}

const useConfigImageAttachments = () => {
	const [images, setImages] = useState<ImageType[] | 'loading' | 'error'>([]);
	const [slides, setSlides] = useState<Slide[]>([]);
	const { message } = useMessageContext();

	useEffect(() => {
		(async () => {
			await Promise.all(
				message.attachments.map(async (attachment) => {
					if (!attachment.width || !attachment.height) {
						const img = await getImageHeightWidth({ imageSrc: attachment.url });

						return {
							src: attachment.url,
							width: img.width,
							height: img.height,
							alt: attachment.description,
						};
					}

					return {
						src: attachment.url,
						width: attachment.width,
						height: attachment.height,
						alt: attachment.description,
					};
				}),
			)
				.then((parsedImages) => setImages(parsedImages))
				.catch(() => setImages('error'));
		})().catch(() => setImages('error'));
	}, [message.attachments]);

	useEffect(() => {
		if (images === 'loading' || images === 'error') return;
		setSlides(
			images.map((image) => ({
				src: image.src,
				alt: image.alt,
				width: image.width,
				height: image.height,
			})),
		);
	}, [images]);

	return { parsedImages: images, parsedSlides: slides };
};

export const MessageAuthorArea = () => {
	const { message } = useMessageContext();

	return (
		<div className="flex w-full min-w-0 gap-2">
			{/* TODO: sort out responsive styling */}
			<div className="flex w-full flex-row items-center gap-2 font-body text-lg text-black/[.7] dark:text-white/[.47]">
				<DiscordAvatar user={message.author} size="sm" />
				<span className="mr-1">{message.author.name}</span>
				<div className="ml-auto mr-4 flex flex-row gap-2">
					<LinkButton
						href={getDiscordURLForMessage(message)}
						onMouseUp={() => {
							trackEvent(
								'View On Discord Click',
								messageWithDiscordAccountToAnalyticsData(message),
							);
						}}
						className="h-8 w-8 bg-transparent p-1 hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
					>
						<DiscordIcon className="h-8 w-8" color="primary" />
						<span className="sr-only">View on Discord</span>
					</LinkButton>
				</div>
				<span>{getSnowflakeUTCDate(message.id)}</span>
			</div>
		</div>
	);
};

const DEFAULT_COLLAPSE_CONTENT_LENGTH = 500;

const LongMessageContents = (props: { collapseBy: number }) => {
	const { message } = useMessageContext();
	const { toHTML } = discordMarkdown;
	const convertedMessageContent = toHTML(message.content);

	const textToRender =
		convertedMessageContent.length > props.collapseBy
			? `${convertedMessageContent.slice(0, props.collapseBy).trim()}...`
			: convertedMessageContent;

	return (
		<div
			className="pt-2 font-body text-ao-black [word-wrap:_break-word] dark:text-ao-white"
			// The HTML from discord-markdown is escaped
			dangerouslySetInnerHTML={{
				__html: textToRender,
			}}
		/>
	);
};

export const MessageContents = () => {
	const { message, collapseContent } = useMessageContext();
	const { toHTML } = discordMarkdown;
	const convertedMessageContent = toHTML(message.content);
	const shouldCollapse =
		collapseContent !== false && collapseContent !== undefined;
	const collapseBy =
		typeof collapseContent === 'number'
			? collapseContent
			: DEFAULT_COLLAPSE_CONTENT_LENGTH;

	if (!shouldCollapse) {
		return (
			<div
				className="pt-2 font-body text-ao-black [word-wrap:_break-word] dark:text-ao-white"
				// The HTML from discord-markdown is escaped
				dangerouslySetInnerHTML={{
					__html: convertedMessageContent,
				}}
			/>
		);
	}

	return <LongMessageContents collapseBy={collapseBy} />;
};

const SingularImageAttachment = () => {
	const { message, loadingStyle } = useMessageContext();
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { parsedImages, parsedSlides } = useConfigImageAttachments();

	if (message.attachments.length === 0) return null;

	if (parsedImages === 'loading' || !parsedImages) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<div className="h-32 w-32 animate-spin rounded-full border-b-4 border-ao-blue" />
			</div>
		);
	}

	if (parsedImages === 'error') {
		return <p className="mt-2 text-lg">An error occurred loading images...</p>;
	}

	return (
		<>
			{parsedImages.map((x, i) => (
				<div className="mt-4 max-w-sm lg:max-w-md" key={i}>
					<Image
						src={x?.src ?? ''}
						width={x?.width}
						height={x?.height}
						alt={x?.alt ?? `Image sent by ${message.author.name}`}
						unoptimized
						loading={loadingStyle}
					/>
				</div>
			))}
		</>
	);
};

export const MessageAttachments = () => {
	const { message } = useMessageContext();

	const imageFileRegex = new RegExp('(.*/)*.+.(png|jpg|gif|bmp|jpeg|webp)$');
	// TODO: Do not mutate here, ugly
	message.attachments = message.attachments.filter((attachment) =>
		imageFileRegex.test(attachment.filename.toLowerCase()),
	);
	if (message.attachments.length === 0) return null;

	// TODO: Rename this and such, whole file needs a revisit but I'm on vacation 🌴
	return <SingularImageAttachment />;
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
	/**
	 * If typed as true, will collapse the content if longer than default
	 * If typed as a number, will collapse the content if longer than the number
	 */
	collapseContent?: boolean | number;
	loadingStyle?: 'lazy' | 'eager';
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
	loadingStyle = 'lazy',
	collapseContent,
}: MessageProps) => {
	return (
		<MessageContext.Provider value={{ message, collapseContent, loadingStyle }}>
			<Blurrer>
				<div
					className={cn(
						`discord-message grow bg-[#E9ECF2] dark:bg-[#181B1F] ${
							showBorders ? 'border-2' : ''
						} border-black/[.13] dark:border-white/[.13] ${
							fullRounded ? 'rounded-standard' : 'lg:rounded-tl-standard'
						}`,
						className,
					)}
				>
					<div className="flex flex-col p-6">
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
	return message.public || isUserInServer === 'in_server';
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
