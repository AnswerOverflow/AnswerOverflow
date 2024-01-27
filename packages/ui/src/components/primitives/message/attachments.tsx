import Image from 'next/image';

import type { MessageProps } from './props';
import { AttachmentDownloader } from './AttachmentDownloader';

const MessageImages = (
	props: Pick<MessageProps, 'message' | 'loadingStyle'>,
) => {
	const { message, collapseContent } = props;
	const imageFileRegex = new RegExp('(.*/)*.+.(png|jpg|gif|bmp|jpeg|webp)$');

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

const AttachmentList = (props: { message: MessageProps['message'] }) => (
	<div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
		{props.message.attachments.map((attachment, i) => (
			<AttachmentDownloader
				key={i}
				filename={attachment.filename}
				url={attachment.proxyUrl}
			/>
		))}
	</div>
);

export const MessageAttachments = (
	props: Pick<MessageProps, 'collapseContent' | 'message' | 'loadingStyle'> & {
		limit?: number;
	},
) => {
	const { message } = props;

	if (message.attachments.length === 0) return null;
	if (props.limit)
		message.attachments = message.attachments.slice(0, props.limit);
	const imageFileRegex = new RegExp('(.*/)*.+.(png|jpg|gif|bmp|jpeg|webp)$');
	const imageAttachments = message.attachments.filter((attachment) =>
		imageFileRegex.test(attachment.filename.toLowerCase()),
	);

	if (
		imageAttachments.length > 0 &&
		imageAttachments.length === message.attachments.length
	) {
		return <MessageImages message={message} />;
	}

	const fileAttachments = message.attachments.filter(
		(attachment) => !imageFileRegex.test(attachment.filename.toLowerCase()),
	);

	if (imageAttachments.length > 0) {
		return (
			<div className="flex flex-col">
				<MessageImages message={message} loadingStyle={props.loadingStyle} />
				<AttachmentList
					message={{
						...message,
						attachments: fileAttachments,
					}}
				/>
			</div>
		);
	}

	return <AttachmentList message={message} />;
};
