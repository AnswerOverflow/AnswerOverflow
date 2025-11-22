"use client";

import type { Attachment } from "@packages/database/convex/schema";
import bytes from "bytes";
import { ArrowUpRight, File } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/button";
import { Skeleton } from "../../components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip";
import { cn } from "../../lib/utils";
import { isEmbeddableAttachment } from "./utils";

const isCode = (a: Attachment) =>
	!a.contentType?.startsWith("image/") || a.filename?.endsWith(".svg");

export function Attachments({ attachments }: { attachments: Attachment[] }) {
	if (!attachments?.length) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2">
			<ImageGallery images={attachments.filter(isEmbeddableAttachment)} />
			{attachments.filter(isCode).map((attachment) => (
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
						<a href={attachmentUrl} target="_blank" rel="noreferrer">
							<Button size="icon" variant="outline">
								<ArrowUpRight className="size-6" />
							</Button>
						</a>
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
	return (
		<div
			className={cn(
				"w-full max-w-[550px] overflow-hidden rounded py-0.5",
				styles[images.length],
			)}
		>
			{images.map((attachment) => {
				const hasDimensions = attachment.width && attachment.height;
				const aspectRatio = hasDimensions
					? Number(
							((attachment.width ?? 0) / (attachment.height ?? 1)).toFixed(4),
						)
					: 16 / 9;
				return (
					<ImageWithSkeleton
						key={attachment.id}
						imageUrl={attachment.url}
						alt={attachment.filename}
						width={attachment.width ?? undefined}
						height={attachment.height ?? undefined}
						aspectRatio={aspectRatio}
					/>
				);
			})}
		</div>
	);
}

function ImageWithSkeleton({
	imageUrl,
	alt,
	width,
	height,
	aspectRatio,
}: {
	imageUrl: string;
	alt: string;
	width?: number;
	height?: number;
	aspectRatio: number;
}) {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	return (
		<div
			className="relative w-full overflow-hidden rounded"
			style={{
				aspectRatio: `${aspectRatio}`,
			}}
		>
			{isLoading && (
				<Skeleton className="absolute inset-0 h-full w-full rounded" />
			)}
			<img
				alt={alt}
				className={cn(
					"absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
					isLoading ? "opacity-0" : "opacity-100",
				)}
				src={imageUrl}
				width={width}
				height={height}
				loading="lazy"
				onLoad={() => setIsLoading(false)}
				onError={() => {
					setIsLoading(false);
					setHasError(true);
				}}
			/>
			{hasError && (
				<div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-neutral-500 text-sm">
					Failed to load image
				</div>
			)}
		</div>
	);
}
