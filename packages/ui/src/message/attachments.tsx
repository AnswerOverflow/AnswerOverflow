import { AttachmentDownloader } from './AttachmentDownloader';
import type { MessageProps } from './props';

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

export const MessageImage = (
	props: {
		attachment: Pick<MessageProps, 'message'>['message']['attachments'][number];
		className?: string;
	} & React.ImgHTMLAttributes<HTMLImageElement>,
) => {
	const { attachment } = props;
	return (
		<div className={`max-w-sm lg:max-w-md ${props.className ?? ''}`}>
			<img
				src={attachment.proxyUrl}
				width={attachment.width ?? undefined}
				height={attachment.height ?? undefined}
				alt={attachment.description ?? 'No description'}
			/>
		</div>
	);
};
export function isImageAttachment(
	attachment: MessageProps['message']['attachments'][number],
) {
	const imageFileRegex = regexes.find((x) => x.type === 'images')?.regex;
	if (!imageFileRegex) return false;
	return imageFileRegex.test(attachment.filename.toLowerCase());
}

export function isVideoAttachment(
	attachment: MessageProps['message']['attachments'][number],
) {
	const videoFileRegex = regexes.find((x) => x.type === 'videos')?.regex;
	if (!videoFileRegex) return false;
	return videoFileRegex.test(attachment.filename.toLowerCase());
}
const MessageImages = (
	props: Pick<MessageProps, 'message' | 'loadingStyle' | 'collapseContent'>,
) => {
	const { message, collapseContent } = props;
	const imageFileRegex = regexes.find((x) => x.type === 'images')?.regex;
	if (!imageFileRegex) return null;

	const onlyImageAttachments = message.attachments.filter(isImageAttachment);
	if (onlyImageAttachments.length === 0) return null;
	const imagesToShow = collapseContent
		? onlyImageAttachments.slice(0, 1)
		: onlyImageAttachments;
	return (
		<>
			{imagesToShow.map((x, i) => (
				<div className="max-w-sm lg:max-w-md" key={i}>
					<MessageImage
						attachment={x}
						loading={props.loadingStyle === 'eager' ? 'eager' : 'lazy'}
						fetchPriority={props.loadingStyle === 'eager' ? 'high' : undefined}
						alt={x.description ?? 'No description'}
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
		<div className="flex flex-col gap-4">
			<MessageImages message={message} loadingStyle={props.loadingStyle} />
			<VideoAttachments message={message} />
			<AttachmentList message={message} />
		</div>
	);
};
