"use client";

import type {
	Attachment,
	Message,
	Reaction,
} from "@packages/database/convex/schema";
import {
	DiscordMessage as DiscordMessageComponent,
	type DiscordMessageProps as DiscordMessageComponentProps,
} from "./discord-message/discord-message";
import type { MessageWithMetadata } from "./discord-message/types";

export type DiscordMessageProps = {
	message: Message;
	author: {
		id: string;
		name: string;
		avatar?: string;
	} | null;
	attachments: Attachment[];
	reactions: Reaction[];
	solutions?: Message[];
	metadata?: MessageWithMetadata["metadata"];
	getAttachmentUrl?: (attachment: Attachment) => string | null;
};

export function DiscordMessage(props: DiscordMessageProps) {
	const transformedReactions = props.reactions.map((reaction) => ({
		userId: reaction.userId,
		emoji: {
			id: reaction.emojiId,
			name: "",
		},
	}));

	const componentProps: DiscordMessageComponentProps = {
		...props,
		attachments: props.attachments,
		reactions: transformedReactions,
	};

	return <DiscordMessageComponent {...componentProps} />;
}
