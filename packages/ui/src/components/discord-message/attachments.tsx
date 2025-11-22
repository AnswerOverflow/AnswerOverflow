import type { Attachment } from "@packages/database/convex/schema";
import bytes from "bytes";
import { ArrowUpRight, File } from "lucide-react";
import { Button } from "../../components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip";
import { cn } from "../../lib/utils";
import { constructDiscordLink, isEmbeddableAttachment } from "./utils";

const isCode = (a: Attachment) =>
	!a.contentType?.startsWith("image/") || a.filename?.endsWith(".svg");

export function Attachments({
	attachments,
	metadata,
}: {
	metadata: {
		serverId: string;
		channelId: string;
	};
	attachments: Attachment[];
}) {
	if (!attachments?.length) {
		return null;
	}

	return (
		<div className="flex flex-col gap-2">
			<ImageGallery images={attachments.filter(isEmbeddableAttachment)} />
			{attachments.filter(isCode).map((attachment) => (
				<FileShowcase
					attachment={attachment}
					key={attachment.id}
					metadata={metadata}
				/>
			))}
		</div>
	);
}

function FileShowcase({
	attachment,
	metadata,
}: {
	metadata: {
		serverId: string;
		channelId: string;
	};
	attachment: Attachment;
}) {
	const { filename, size, messageId } = attachment;
	const attachmentMessageUrl = constructDiscordLink({
		serverId: metadata.serverId,
		threadId: metadata.channelId,
		messageId,
	});

	return (
		<div className="group relative mt-2 flex w-full max-w-md gap-2.5 border border-neutral-300 p-4 shadow">
			<div className="flex items-center justify-center">
				<File className="size-10" />
			</div>
			<div className="flex flex-col overflow-hidden">
				<a
					className="overflow-hidden text-ellipsis whitespace-nowrap underline-offset-2 hover:underline"
					href={attachmentMessageUrl}
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
						<a href={attachmentMessageUrl} target="_blank" rel="noreferrer">
							<Button size="icon" variant="outline">
								<ArrowUpRight className="size-6" />
							</Button>
						</a>
					</TooltipTrigger>
					<TooltipContent>
						<p>Open in discord</p>
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
				const imageUrl =
					attachment.storageId && process.env.NEXT_PUBLIC_CONVEX_URL
						? `${process.env.NEXT_PUBLIC_CONVEX_URL.replace(
								/\.cloud$/,
								".site",
							)}/getAttachment?storageId=${attachment.storageId}`
						: null;
				if (!imageUrl) {
					return null;
				}
				const hasDimensions = attachment.width && attachment.height;
				const aspectRatio = hasDimensions
					? Number((attachment.width! / attachment.height!).toFixed(4))
					: 16 / 9;
				return (
					<div
						key={attachment.id}
						className="relative w-full overflow-hidden rounded"
						style={{
							aspectRatio: `${aspectRatio}`,
						}}
					>
						<img
							alt={attachment.filename}
							className="absolute inset-0 h-full w-full object-cover"
							src={imageUrl}
							width={attachment.width ?? undefined}
							height={attachment.height ?? undefined}
							loading="lazy"
						/>
					</div>
				);
			})}
		</div>
	);
}
