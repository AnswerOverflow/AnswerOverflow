"use client";

import { ChannelType } from "discord-api-types/v10";
import { ChevronRight, MessageSquare } from "lucide-react";
import type React from "react";
import { Link as NextLink } from "../link";
import { ChannelIcon } from "./mention";
import type { MessageWithMetadata } from "./types";

export function Link({
	target,
	content,
	message,
}: {
	target: string;
	content: React.ReactNode;
	message: MessageWithMetadata;
}) {
	const isInternalLink = message?.metadata?.internalLinks?.find(
		(x) => x.original === target,
	);

	if (isInternalLink) {
		const { original, channel, message: messageId } = isInternalLink;

		const isThread =
			channel.type === ChannelType.PublicThread ||
			channel.type === ChannelType.AnnouncementThread ||
			channel.type === ChannelType.PrivateThread;

		const answerOverflowUrl = messageId
			? `/m/${messageId}`
			: isThread
				? `/m/${channel.id}`
				: channel.indexingEnabled
					? `/c/${isInternalLink.guild.id}/${channel.id}`
					: undefined;

		const parentName = channel.parent?.name;
		const channelName = channel.name;

		const linkContent = (
			<>
				{messageId ? (
					<>
						<ChannelIcon type={channel.type} />
						<span>{channelName}</span>
						<ChevronRight className="inline-block size-2.5 text-blue-600 dark:text-blue-400" />
						<MessageSquare
							className="inline-block size-4 text-blue-600 dark:text-blue-400"
							fill="currentColor"
						/>
					</>
				) : isThread && parentName ? (
					<>
						<span className="inline-block space-x-0.5">
							<ChannelIcon
								type={channel.parent?.type ?? ChannelType.GuildText}
							/>
							<span>{parentName}</span>
						</span>
						<ChevronRight className="inline-block size-2.5 text-blue-600 dark:text-blue-400" />
						<ChannelIcon type={channel.type} />
						<span>{channelName}</span>
					</>
				) : (
					<>
						<ChannelIcon type={channel.type} />
						<span>{channelName}</span>
					</>
				)}
			</>
		);

		const wrapperClassName =
			"not-prose space-x-0.5 rounded bg-blue-50 dark:bg-blue-900/30 p-0.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors";

		if (answerOverflowUrl) {
			return (
				<NextLink
					href={answerOverflowUrl}
					onClick={(e) => e.stopPropagation()}
					className={wrapperClassName}
				>
					{linkContent}
				</NextLink>
			);
		}

		return (
			<span
				className={`${wrapperClassName} cursor-pointer`}
				onClick={(e) => {
					e.stopPropagation();
					window.open(original, "_blank");
				}}
			>
				{linkContent}
			</span>
		);
	}

	return (
		<a
			href={target}
			rel="noreferrer"
			target="_blank"
			onClick={(e) => e.stopPropagation()}
			className="text-blue-600 hover:underline dark:text-blue-400"
		>
			{content}
		</a>
	);
}
