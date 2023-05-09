// This component file is based off - https://www.youtube.com/watch?v=vPRdY87_SH0
import type { APIMessageWithDiscordAccount } from '@answeroverflow/api';
import discordMarkdown from 'discord-markdown';
import Image from 'next/image';
import React, { createContext, useContext, useState } from 'react';
import { DiscordAvatar } from './DiscordAvatar';
import { useIsUserInServer } from '~ui/utils/hooks';
import { getSnowflakeUTCDate } from '~ui/utils/snowflake';
import { cn } from '~ui/utils/styling';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { LinkButton, DiscordIcon, CloseIcon, Heading } from './base';
import {
	trackEvent,
	messageWithDiscordAccountToAnalyticsData,
} from '@answeroverflow/hooks';
import { getDiscordURLForMessage } from '~ui/utils/discord';
import {
	Gallery,
	type Image as ImageType,
	type ThumbnailImageProps,
} from 'react-grid-gallery';
import { useEffect } from 'react';
import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import { Zoom, Counter } from 'yet-another-react-lightbox/plugins';
import 'yet-another-react-lightbox/styles.css';

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

export const MessageContents = () => {
	const { message } = useMessageContext();
	const { toHTML } = discordMarkdown;
	const convertedMessageContent = toHTML(message.content);
	return (
		<div
			className="pt-2 font-body text-ao-black [word-wrap:_break-word] dark:text-ao-white"
			// The HTML from discord-markdown is escaped
			dangerouslySetInnerHTML={{
				__html: convertedMessageContent,
			}}
		/>
	);
};

const MessageModalWrapper = ({
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
				<AlertDialog.Content className="fixed left-0 top-0 z-[75] flex h-full w-full flex-col items-center justify-center p-4">
					<div className="absolute right-0 top-0 z-[100] p-2">
						<AlertDialog.Cancel className="flex h-8 w-8 items-center justify-center rounded-full bg-white transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring focus:ring-gray-300 dark:bg-black dark:hover:bg-gray-800">
							<CloseIcon />
						</AlertDialog.Cancel>
					</div>
					{/* eslint-disable-next-line @next/next/no-img-element */}
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

const getImageHeightWidth = async ({ imageSrc }: { imageSrc: string }) => {
	return new Promise<{
		width: number;
		height: number;
	}>((resolve, reject) => {
		const img = new window.Image();
		img.src = imageSrc;
		img.onload = () => {
			resolve({ width: img.width, height: img.height });
		};
		img.onerror = (event) => {
			reject(event);
		};
	});
};

export const MessageAttachments = () => {
	const { message } = useMessageContext();
	const [images, setImages] = useState<ImageType[] | 'loading' | 'error'>(
		'loading',
	);
	const [currentImageOpen, setCurrentImageOpen] = useState<number>(-1);
	const [slides, setSlides] = useState<Slide[]>();

	useEffect(() => {
		const fetchData = async () => {
			const images = await Promise.all(
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
			);

			setImages(images);
			setSlides(
				images.map((image) => ({
					src: image.src,
					alt: image.alt,
					width: image.width,
					height: image.height,
				})),
			);
		};

		fetchData()
			.then(() => {})
			.catch(() => {
				return setImages('error');
			});
	}, [message.attachments]);

	const CustomImageComponent = (props: ThumbnailImageProps) => {
		if (props.index === 3 && images.length > 3) {
			return (
				<button className="relative h-full w-full" aria-label="Open image">
					<Image
						src={props.item.src}
						fill
						alt={`A preview of an image sent by ${message.author.name}`}
					/>
					<div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-brightness-50">
						<span className="text-3xl font-bold text-white">
							+{images.length - 3}
						</span>
					</div>
				</button>
			);
		}

		return (
			<button aria-label="Open image" className="h-full">
				<Image
					src={props.item.src}
					fill
					alt={`A preview of an image sent by ${message.author.name}`}
				/>
			</button>
		);
	};

	function MessageImage({
		attachment,
	}: {
		attachment: APIMessageWithDiscordAccount['attachments'][number];
	}) {
		const width = attachment.width;
		const height = attachment.height;
		if (!width || !height)
			return (
				// TODO: Bit of a hack for now since next images don't work well with no w/h specified
				// eslint-disable-next-line @next/next/no-img-element
				<MessageModalWrapper attachment={attachment}>
					{/*  eslint-disable-next-line @next/next/no-img-element */}
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

		return (
			<MessageModalWrapper attachment={attachment}>
				<Image
					key={attachment.url}
					src={attachment.url}
					width={width}
					height={height}
					className="cursor-zoom-in py-4 md:max-w-md"
					alt={attachment.description ? attachment.description : 'Image'}
				/>
			</MessageModalWrapper>
		);
	}

	if (message.attachments.length === 1 && message.attachments[0]) {
		return <MessageImage attachment={message.attachments[0]} />;
	}

	if (images === 'loading') {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<div className="h-32 w-32 animate-spin rounded-full border-b-4 border-ao-blue" />
			</div>
		);
	}

	if (images === 'error') {
		return (
			<Heading.H2 className="mt-2 text-lg">
				An error occurred loading images...
			</Heading.H2>
		);
	}

	return (
		<div className="mt-4">
			<Gallery
				images={images.slice(0, 4)}
				enableImageSelection={false}
				onClick={(index) => setCurrentImageOpen(index)}
				thumbnailImageComponent={CustomImageComponent}
			/>
			<Lightbox
				slides={slides}
				open={currentImageOpen >= 0}
				index={currentImageOpen}
				close={() => setCurrentImageOpen(-1)}
				plugins={[Zoom, Counter]}
				styles={{
					container: {
						backgroundColor: 'rgba(0, 0, 0, 0.9)',
					},
				}}
				controller={{
					closeOnBackdropClick: true,
				}}
				counter={{
					style: { top: 0, left: 0, position: 'absolute' },
					className: 'p-4 m-4 text-white',
				}}
			/>
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
						`discord-message grow bg-[#E9ECF2] dark:bg-[#181B1F] ${
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
