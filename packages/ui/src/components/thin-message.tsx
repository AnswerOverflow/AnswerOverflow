"use client";

import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Link } from "./link";
import { TimeAgo } from "./time-ago";
import { cn } from "../lib/utils";
import { MessageBody } from "./message-body";
import { MessageBlurrer } from "./message-blurrer";

function getDiscordAvatarUrl(
	userId: string,
	avatar?: string,
	size = 40,
): string {
	if (avatar) {
		return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.webp?size=${size}`;
	}
	const defaultAvatar = (parseInt(userId) % 5).toString();
	return `/discord/${defaultAvatar}.png`;
}

export function ThinMessage(props: {
	message: EnrichedMessage;
	op?: boolean;
	isSolution?: boolean;
}) {
	const { message, op } = props;
	const author = message.author;

	return (
		<MessageBlurrer message={message}>
			<div className="flex flex-row">
				<div className="mb-8 w-[40px] flex-shrink-0">
					{author ? (
						<Avatar className="h-10 w-10">
							<AvatarImage
								src={getDiscordAvatarUrl(author.id, author.avatar)}
								alt={author.name}
							/>
							<AvatarFallback>
								{author.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
					) : (
						<div className="h-10 w-10 rounded-full bg-muted" />
					)}
					<div className={cn("mx-auto h-full w-0 rounded-full border-1")} />
				</div>
				<div className="flex flex-col pl-2 pt-2">
					<div className="flex flex-row items-center gap-2 text-muted-foreground">
						{author ? (
							<Link className="hover:underline" href={`/u/${author.id}`}>
								{author.name}
							</Link>
						) : (
							<span>Unknown</span>
						)}
						{op && (
							<span className="text-muted-foreground border-[1.5px] text-sm border-muted-foreground px-1 rounded-md">
								OP
							</span>
						)}
						<span className="text-sm">•</span>
						<TimeAgo snowflake={message.message.id} />
					</div>
					<div>
						<MessageBody message={message} />
					</div>
				</div>
			</div>
		</MessageBlurrer>
	);
}
