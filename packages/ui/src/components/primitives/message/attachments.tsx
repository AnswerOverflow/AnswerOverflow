import Image from 'next/image';

import type { MessageProps } from './props';
import { AttachmentDownloader } from './AttachmentDownloader';

const regexes = [
	{
		type: 'images',
		regex: new RegExp('(.*/)*.+.(png|jpg|gif|bmp|jpeg|webp)$'),
	},
	{
		type: 'videos',
		regex: new RegExp('(.*/)*.+.(mp4|mov|webm|avi|mkv|flv|wmv)$'),
	},
] as const;

const MessageImages = (
	props: Pick<MessageProps, 'message' | 'loadingStyle' | 'collapseContent'>,
) => {
	const { message, collapseContent } = props;
	const imageFileRegex = regexes.find((x) => x.type === 'images')?.regex;
	if (!imageFileRegex) return null;

	const onlyImageAttachments = message.attachments.filter((attachment) =>
		imageFileRegex.test(attachment.filename.toLowerCase()),
	);
	if (onlyImageAttachments.length === 0) return null;
	const images = onlyImageAttachments.map((attachment) => {
		return {
			src: attachment.proxyUrl,
			width: attachment.width,
			height: attachment.height,
			alt: attachment.description ?? 'No description',
		};
	});
	const imagesToShow = collapseContent ? images.slice(0, 1) : images;
	return (
		<>
			{imagesToShow.map((x, i) => (
				<div className="mt-4 max-w-sm lg:max-w-md" key={i}>
					<Image
						src={x?.src ?? ''}
						width={x?.width ?? undefined}
						height={x?.height ?? undefined}
						unoptimized
						loading={props.loadingStyle === 'eager' ? 'eager' : 'lazy'}
						priority={props.loadingStyle === 'eager'}
						fetchPriority={props.loadingStyle === 'eager' ? 'high' : undefined}
						alt={x?.alt ?? `Image sent by ${message.author.name}`}
					/>
				</div>
			))}
		</>
	);
};

const VideoAttachments = ({
	message,
}: {
	message: MessageProps['message'];
}) => {
	const videoFileRegex = regexes.find((x) => x.type === 'videos')?.regex;
	if (!videoFileRegex) return null;
	const onlyVideoAttachments = message.attachments.filter((attachment) =>
		videoFileRegex.test(attachment.filename.toLowerCase()),
	);

	if (onlyVideoAttachments.length === 0) return null;

	return (
		<>
			{onlyVideoAttachments.map((attachment, i) => (
				<div className="mt-4 max-w-sm lg:max-w-md" key={i}>
					<video
						src={attachment.proxyUrl}
						controls
						className="w-full"
						title={attachment.filename}
					/>
				</div>
			))}
		</>
	);
};

const AttachmentList = (props: { message: MessageProps['message'] }) => {
	const allRegexes = regexes.map((x) => x.regex);
	const otherAttachments = props.message.attachments.filter((attachment) =>
		allRegexes.every((regex) => !regex.test(attachment.filename.toLowerCase())),
	);

	if (otherAttachments.length === 0) return null;

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
			{otherAttachments.map((attachment, i) => (
				<AttachmentDownloader
					key={i}
					filename={attachment.filename}
					url={attachment.proxyUrl}
				/>
			))}
		</div>
	);
};

export const MessageAttachments = (
	props: Pick<MessageProps, 'message' | 'loadingStyle'> & {
		limit?: number;
	},
) => {
	const { message } = props;

	if (message.attachments.length === 0) return null;
	if (props.limit)
		message.attachments = message.attachments.slice(0, props.limit);

	return (
		<div className="mt-4 flex flex-col gap-4">
			<MessageImages message={message} loadingStyle={props.loadingStyle} />
			<VideoAttachments message={message} />
			<AttachmentList message={message} />
		</div>
	);
};
