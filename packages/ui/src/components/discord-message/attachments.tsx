"use client";

import type { Attachment } from "@packages/database/convex/schema";
import bytes from "bytes";
import { ArrowUpRight, File } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/button";
import { ImageLightbox } from "../../components/image-lightbox";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip";
import { cn } from "../../lib/utils";
import { isEmbeddableAttachment, isVideoAttachment } from "./utils";

export function Attachments({ attachments }: { attachments: Attachment[] }) {
	if (!attachments?.length) {
		return null;
	}

	const images = attachments.filter(isEmbeddableAttachment);
	const videos = attachments.filter(isVideoAttachment);
	const otherFiles = attachments.filter(
		(a) => !isEmbeddableAttachment(a) && !isVideoAttachment(a),
	);

	return (
		<div className="flex flex-col gap-2">
			<ImageGallery images={images} />
			{videos.map((attachment) => (
				<VideoPlayer attachment={attachment} key={attachment.id} />
			))}
			{otherFiles.map((attachment) => (
				<FileShowcase attachment={attachment} key={attachment.id} />
			))}
		</div>
	);
}

function FileShowcase({ attachment }: { attachment: Attachment }) {
	const { filename, size, url: attachmentUrl } = attachment;

	return (
		<div className="group relative mt-2 flex w-full max-w-md gap-2.5 border border-neutral-300 p-4 shadow">
			<div className="flex items-center justify-center">
				<File className="size-10" />
			</div>
			<div className="flex flex-col overflow-hidden">
				<a
					className="overflow-hidden text-ellipsis whitespace-nowrap underline-offset-2 hover:underline"
					href={attachmentUrl}
					target="_blank"
					rel="noreferrer"
				>
					{filename}
				</a>
				<span className="text-neutral-500 text-sm">
					{bytes(size, { decimalPlaces: 2 })}{" "}
				</span>
			</div>
			<div className="group-hover:fade-in-0 group-hover:zoom-in-95 absolute top-0 right-0 translate-x-[50%] translate-y-[-50%] opacity-0 transition-opacity duration-300 group-hover:animate-in group-hover:opacity-100">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button size="icon" variant="outline" asChild>
							<a href={attachmentUrl} target="_blank" rel="noreferrer">
								<ArrowUpRight className="size-6" />
							</a>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Open attachment</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}

function ImageGallery({ images }: { images: Attachment[] }) {
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(0);

	if (!images.length) {
		return null;
	}

	const styles: Record<number, string> = {
		1: "grid gap-1s",
		2: "grid gap-1 grid-cols-2  ",
		3: "grid gap-1 grid-cols-2 grid-rows-2  [&>*:first-child]:row-span-2",
		4: "grid gap-1 grid-cols-2 grid-rows-2 ",
		5: "grid gap-1 grid-cols-6 grid-rows-2 [&>*:nth-child(-n+2)]:col-span-3 [&>*:nth-child(n+3)]:col-span-2",
		6: "grid gap-1 grid-cols-3 grid-rows-2 *:h-[181px]",
		7: "grid gap-1 grid-cols-3 grid-rows-3 *:h-[181px] [&>*:first-child]:col-span-3",
		8: "grid gap-1 grid-cols-6 grid-rows-3 *:h-[181px] [&>*:nth-child(n+3)]:col-span-2 [&>*:nth-child(-n+2)]:col-span-3",
		9: "grid gap-1 grid-cols-3 grid-rows-3 *:h-[181px]",
		10: "grid gap-1 grid-cols-3 grid-rows-4 *:h-[181px] [&>*:first-child]:col-span-3",
	};

	const lightboxImages = images.map((attachment) => ({
		src: attachment.url,
		alt: attachment.filename,
		width: attachment.width ?? undefined,
		height: attachment.height ?? undefined,
	}));

	const handleImageClick = (index: number) => {
		setSelectedIndex(index);
		setLightboxOpen(true);
	};

	return (
		<>
			<div
				className={cn(
					"w-full max-w-[550px] overflow-hidden rounded py-0.5",
					styles[images.length],
				)}
			>
				{images.map((attachment, index) => {
					const hasDimensions = attachment.width && attachment.height;
					const aspectRatio = hasDimensions
						? Number(
								((attachment.width ?? 0) / (attachment.height ?? 1)).toFixed(4),
							)
						: 16 / 9;
					return (
						<ImageWithAspectRatio
							key={attachment.id}
							imageUrl={attachment.url}
							alt={attachment.filename}
							width={attachment.width ?? undefined}
							height={attachment.height ?? undefined}
							aspectRatio={aspectRatio}
							onClick={() => handleImageClick(index)}
						/>
					);
				})}
			</div>
			<ImageLightbox
				images={lightboxImages}
				initialIndex={selectedIndex}
				open={lightboxOpen}
				onOpenChange={setLightboxOpen}
			/>
		</>
	);
}

function ImageWithAspectRatio({
	imageUrl,
	alt,
	width,
	height,
	aspectRatio,
	onClick,
}: {
	imageUrl: string;
	alt: string;
	width?: number;
	height?: number;
	aspectRatio: number;
	onClick?: () => void;
}) {
	return (
		<div
			className="relative w-full cursor-pointer overflow-hidden rounded transition-opacity hover:opacity-90"
			style={{
				aspectRatio: `${aspectRatio}`,
			}}
			onClick={onClick}
			onKeyDown={(e) => {
				if (onClick && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					onClick();
				}
			}}
			role="button"
			tabIndex={0}
		>
			<img
				alt={alt}
				className="absolute inset-0 h-full w-full object-cover"
				src={imageUrl}
				width={width}
				height={height}
				loading="lazy"
			/>
		</div>
	);
}

const BROWSER_SUPPORTED_VIDEO_TYPES = new Set([
	"video/mp4",
	"video/webm",
	"video/ogg",
]);

function VideoPlayer({ attachment }: { attachment: Attachment }) {
	const hasDimensions = attachment.width && attachment.height;
	const aspectRatio = hasDimensions
		? Number(((attachment.width ?? 0) / (attachment.height ?? 1)).toFixed(4))
		: 16 / 9;

	const contentType =
		attachment.contentType &&
		BROWSER_SUPPORTED_VIDEO_TYPES.has(attachment.contentType)
			? attachment.contentType
			: undefined;

	return (
		<div
			className="relative w-full max-w-[550px] overflow-hidden rounded"
			style={{
				aspectRatio: `${aspectRatio}`,
			}}
		>
			<video
				className="h-full w-full object-contain"
				controls
				width={attachment.width ?? undefined}
				height={attachment.height ?? undefined}
			>
				<source src={attachment.url} type={contentType} />
			</video>
		</div>
	);
}
