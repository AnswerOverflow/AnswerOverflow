import Image from 'next/image';

import type { MessageProps } from './props';
import { Image as ImageType } from 'react-grid-gallery';
export const getImageHeightWidth = async ({
	imageSrc,
}: {
	imageSrc: string;
}) => {
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

const SingularImageAttachment = async (
	props: Pick<MessageProps, 'collapseContent' | 'message' | 'loadingStyle'>,
) => {
	const { message, collapseContent } = props;
	const images = await Promise.all(
		message.attachments.map(async (attachment): Promise<ImageType> => {
			if (!attachment.width || !attachment.height) {
				const img = await getImageHeightWidth({
					imageSrc: attachment.proxyUrl,
				});

				return {
					src: attachment.proxyUrl,
					width: img.width,
					height: img.height,
					alt: attachment.description ?? 'No description',
				};
			}

			return {
				src: attachment.proxyUrl,
				width: attachment.width,
				height: attachment.height,
				alt: attachment.description ?? 'No description',
			};
		}),
	);

	if (message.attachments.length === 0) return null;

	const imagesToShow = collapseContent ? images.slice(0, 1) : images;

	return (
		<>
			{imagesToShow.map((x, i) => (
				<div className="mt-4 max-w-sm lg:max-w-md" key={i}>
					<Image
						src={x?.src ?? ''}
						width={x?.width}
						height={x?.height}
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

export const MessageAttachments = (
	props: Pick<MessageProps, 'message' | 'loadingStyle'> & {
		limit?: number;
	},
) => {
	const { message } = props;
	const imageFileRegex = new RegExp('(.*/)*.+.(png|jpg|gif|bmp|jpeg|webp)$');
	// TODO: Do not mutate here, ugly
	message.attachments = message.attachments.filter((attachment) =>
		imageFileRegex.test(attachment.filename.toLowerCase()),
	);
	if (message.attachments.length === 0) return null;
	if (props.limit)
		message.attachments = message.attachments.slice(0, props.limit);

	// TODO: Rename this and such, whole file needs a revisit but I'm on vacation 🌴
	return (
		<SingularImageAttachment
			message={message}
			loadingStyle={props.loadingStyle}
		/>
	);
};
