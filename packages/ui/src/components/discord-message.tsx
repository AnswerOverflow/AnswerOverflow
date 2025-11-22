"use client";

import type { Attachment } from "@packages/database/convex/schema";
import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import {
	DiscordMessage as DiscordMessageComponent,
	type DiscordMessageProps as DiscordMessageComponentProps,
} from "./discord-message/discord-message";

export type { EnrichedMessage };

export type DiscordMessageProps = {
	enrichedMessage: EnrichedMessage;
	getAttachmentUrl?: (attachment: Attachment) => string | null;
};

export function DiscordMessage(props: DiscordMessageProps) {
	const { enrichedMessage, getAttachmentUrl } = props;

	const componentProps: DiscordMessageComponentProps = {
		message: enrichedMessage.message,
		author: enrichedMessage.author,
		attachments: enrichedMessage.attachments,
		reactions: enrichedMessage.reactions,
		solutions: enrichedMessage.solutions,
		metadata: enrichedMessage.metadata,
		getAttachmentUrl,
	};

	return <DiscordMessageComponent {...componentProps} />;
}
