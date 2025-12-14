"use client";

import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import { cn } from "../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { makeUserIconLink } from "./discord-avatar";
import { ReplyBar } from "./discord-message/reply-bar";
import { Link } from "./link";
import { MessageBlurrer } from "./message-blurrer";
import { MessageBody } from "./message-body";
import { MessageTimestamp } from "./message-timestamp";

export function ThinMessage(props: {
	message: EnrichedMessage;
	op?: boolean;
	isSolution?: boolean;
	isLast?: boolean;
}) {
	const { message, op, isLast } = props;
	const author = message.author;
	const isBot = message.message.applicationId !== undefined;

	return (
		<MessageBlurrer message={message}>
			<div className="flex flex-col min-w-0">
				{message.reference && (
					<div className="flex flex-row min-w-0 ml-[48px]">
						<ReplyBar reference={message.reference} />
					</div>
				)}
				<div className="flex flex-row min-w-0">
					<div className="mb-8 w-[40px] flex-shrink-0">
						{author ? (
							<Avatar className="h-10 w-10">
								<AvatarImage
									src={makeUserIconLink(
										{
											id: author.id.toString(),
											name: author.name,
											avatar: author.avatar,
										},
										40,
									)}
									alt={author.name}
								/>
								<AvatarFallback>
									{author.name.charAt(0).toUpperCase()}
								</AvatarFallback>
							</Avatar>
						) : (
							<div className="h-10 w-10 rounded-full bg-muted" />
						)}
						{!isLast && (
							<div className={cn("mx-auto h-full w-0 rounded-full border-1")} />
						)}
					</div>
					<div className="flex flex-col pl-2 pt-2 min-w-0 flex-1">
						<div className="flex flex-row items-center gap-2 text-muted-foreground">
							{author ? (
								<Link
									className="hover:underline"
									href={`/u/${author.id.toString()}`}
								>
									{author.name}
								</Link>
							) : (
								<span>Unknown</span>
							)}
							{isBot && (
								<Badge
									variant="default"
									className="rounded-sm px-1 py-0 text-[10px] font-medium h-4 bg-blurple text-white"
								>
									APP
								</Badge>
							)}
							{op && (
								<Badge
									variant="secondary"
									className="rounded-md px-1.5 py-0 text-[10px] font-bold h-5"
								>
									OP
								</Badge>
							)}
							<span className="text-sm">•</span>
							<MessageTimestamp snowflake={message.message.id.toString()} />
						</div>
						<div>
							<MessageBody message={message} />
						</div>
					</div>
				</div>
			</div>
		</MessageBlurrer>
	);
}
