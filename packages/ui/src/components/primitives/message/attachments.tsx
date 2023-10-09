'use client';
import Image from 'next/image';
import { type Image as ImageType } from 'react-grid-gallery';
import { useEffect, useState } from 'react';
import { type Slide } from 'yet-another-react-lightbox';
import { getImageHeightWidth } from '~ui/utils/other';
import type { MessageProps } from './props';
const useConfigImageAttachments = (props: Pick<MessageProps, 'message'>) => {
	const [images, setImages] = useState<ImageType[] | 'loading' | 'error'>([]);
	const [slides, setSlides] = useState<Slide[]>([]);
	const { message } = props;

	useEffect(() => {
		(async () => {
			await Promise.all(
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

const SingularImageAttachment = (
	props: Pick<MessageProps, 'collapseContent' | 'message' | 'loadingStyle'>,
) => {
	const { message, loadingStyle, collapseContent } = props;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { parsedImages, parsedSlides } = useConfigImageAttachments(props);

	if (message.attachments.length === 0) return null;

	if (parsedImages === 'loading' || !parsedImages) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<div className="h-32 w-32 animate-spin rounded-full border-b-4" />
			</div>
		);
	}

	if (parsedImages === 'error') {
		return <p className="mt-2 text-lg">An error occurred loading images...</p>;
	}

	const imagesToShow = collapseContent
		? parsedImages.slice(0, 1)
		: parsedImages;

	return (
		<>
			{imagesToShow.map((x, i) => (
				<div className="mt-4 max-w-sm lg:max-w-md" key={i}>
					<Image
						src={x?.src ?? ''}
						width={x?.width}
						height={x?.height}
						alt={x?.alt ?? `Image sent by ${message.author.name}`}
						unoptimized
						loading={loadingStyle}
						priority={loadingStyle !== 'lazy'}
					/>
				</div>
			))}
		</>
	);
};

export const MessageAttachments = (
	props: Pick<MessageProps, 'message'> & {
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
	return <SingularImageAttachment message={message} />;
};
