// This component file is based off - https://www.youtube.com/watch?v=vPRdY87_SH0
import type {
	APIMessageWithDiscordAccount,
	ChannelPublicWithFlags,
} from '@answeroverflow/api';
import discordMarkdown from 'discord-markdown';
import Parser from 'html-react-parser';
import Image from 'next/image';
import { createContext, useContext } from 'react';
import { DiscordAvatar } from '~ui/components/DiscordAvatar';
import { useIsUserInServer } from '~ui/utils/hooks';
import { getSnowflakeUTCDate } from '~ui/utils/snowflake';

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
			<div className="flex w-full flex-row items-center gap-2 font-body text-lg text-[#FFFFFF]/[.47]">
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
	return <div className={'pt-2 text-ao-white'}>{parsedMessageContent}</div>;
};

export const MessageTitle = ({
	thread,
	channel,
}: {
	thread?: ChannelPublicWithFlags;
	channel: ChannelPublicWithFlags;
}) => {
	return (
		<div className="pt-4">
			<h4 className="font-body text-4xl font-semibold text-ao-white">
				{thread?.name ?? channel.name}
			</h4>
		</div>
	);
};

export const MessageImages = () => {
	const { message } = useMessageContext();
	function MessageImage({
		image,
	}: {
		image: APIMessageWithDiscordAccount['images'][number];
	}) {
		let width = image.width;
		let height = image.height;
		const maxWidth = 400;
		const maxHeight = 300;

		if (!width || !height)
			return (
				// TODO: Bit of a hack for now since next images don't work well with no w/h specified
				// eslint-disable-next-line @next/next/no-img-element
				<img
					className="max-w-full md:max-w-sm"
					src={image.url}
					style={{
						width: 'fit-content',
						height: 'auto',
						objectFit: 'cover',
					}}
					alt={image.description ? image.description : 'Image'}
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
				key={image.url}
				src={image.url}
				width={originalWidth}
				height={originalHeight}
				alt={image.description ? image.description : 'Image'}
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
			{message.images.map((image) => (
				<MessageImage key={image.url} image={image} />
			))}
		</div>
	);
};

type MessageRendererProps = {
	avatar?: React.ReactNode;
	content?: React.ReactNode;
	authorArea?: React.ReactNode;
	images?: React.ReactNode;
	showBorders?: boolean;
};

export function MessageRenderer({
	content = <MessageContents />,
	authorArea = <MessageAuthorArea />,
	images = <MessageImages />,
	showBorders,
}: MessageRendererProps) {
	return (
		<div
			className={`rounded-t-standard grow lg:rounded-tr-none ${
				showBorders ? 'border-x-2 border-t-2' : ''
			} border-white/[.13]`}
		>
			<div className="p-6">
				<div className="flex items-center gap-2">{authorArea}</div>
				{content}
				{images}
			</div>
		</div>
	);
}

export const Message = ({
	message,
	Blurrer = MessageBlurrer,
	messageRenderer = <MessageRenderer />,
}: {
	message: APIMessageWithDiscordAccount;
	Blurrer?: React.FC<{ children: React.ReactNode }>;
	messageRenderer?: React.ReactNode;
}) => {
	return (
		<MessageContext.Provider value={{ message }}>
			<Blurrer>{messageRenderer}</Blurrer>
		</MessageContext.Provider>
	);
};

export function MessageBlurrer({ children }: { children: React.ReactNode }) {
	const { message } = useMessageContext();
	const isUserInServer = useIsUserInServer(message.serverId);
	const isBlurred = !isUserInServer && !message.public;
	// We must hide backdrop blur to prevent the border around the message from being blurred as well - causes weird color change
	return (
		<ContentBlurrer blurred={isBlurred} hideBackdropBlur>
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
						className={`rounded-standard flex flex-col items-center justify-center bg-ao-black/75 p-5 text-center text-ao-white backdrop-blur-sm`}
					>
						<div className="text-2xl">{notPublicTitle}</div>
						<div>{notPublicInstructions}</div>
					</div>
				</div>
			</div>
		</div>
	);
};
