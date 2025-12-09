"use client";

import type { EnrichedMessageReference } from "@packages/database/convex/shared/shared";
import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { makeUserIconLink } from "../discord-avatar";
import { Link } from "../link";

export type ReplyBarProps = {
	reference: EnrichedMessageReference;
	className?: string;
};

export function ReplyBar({ reference, className }: ReplyBarProps) {
	const refMessage = reference.message;

	if (!refMessage) {
		return (
			<div
				className={cn(
					"flex items-center gap-2 text-sm text-muted-foreground mb-1",
					className,
				)}
			>
				<ReplyIcon />
				<Link
					href={`/m/${reference.messageId.toString()}`}
					className="italic hover:text-foreground transition-colors"
				>
					Original message was deleted
				</Link>
			</div>
		);
	}

	const author = refMessage.author;
	const content = refMessage.message.content;
	const truncatedContent =
		content.length > 80 ? `${content.slice(0, 80)}...` : content;
	const hasAttachments = refMessage.attachments.length > 0;

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 text-sm text-muted-foreground mb-1 min-w-0",
				className,
			)}
		>
			<ReplyIcon />
			{author ? (
				<>
					<Avatar className="size-4 flex-shrink-0">
						<AvatarImage
							src={makeUserIconLink(
								{
									id: author.id.toString(),
									name: author.name,
									avatar: author.avatar,
								},
								16,
							)}
							alt={author.name}
						/>
						<AvatarFallback className="text-[8px]">
							{author.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<Link
						href={`/u/${author.id.toString()}`}
						className="font-medium hover:underline flex-shrink-0"
					>
						{author.name}
					</Link>
				</>
			) : (
				<span className="font-medium flex-shrink-0">Unknown User</span>
			)}
			<Link
				href={`/m/${refMessage.message.id.toString()}`}
				className="truncate hover:text-foreground transition-colors"
			>
				{truncatedContent || (
					<span className="italic">
						{hasAttachments ? "Click to see attachment" : "Empty message"}
					</span>
				)}
			</Link>
		</div>
	);
}

function ReplyIcon() {
	return (
		<svg
			className="w-8 h-3 flex-shrink-0 text-muted-foreground/50"
			viewBox="0 0 32 12"
			fill="none"
		>
			<path
				d="M4 11 C 4 6, 4 3, 12 3 L 30 3"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				fill="none"
			/>
		</svg>
	);
}
