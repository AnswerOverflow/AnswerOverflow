"use client";

import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import {
	DiscordMessage as DiscordMessageComponent,
	type DiscordMessageProps as DiscordMessageComponentProps,
} from "./discord-message/discord-message";

export type { EnrichedMessage };

export type DiscordMessageProps = {
	enrichedMessage: EnrichedMessage;
	showCard?: boolean;
	hideSolutions?: boolean;
};

export function DiscordMessage(props: DiscordMessageProps) {
	const { enrichedMessage, showCard = true, hideSolutions = false } = props;

	const componentProps: DiscordMessageComponentProps = {
		message: enrichedMessage.message,
		author: enrichedMessage.author,
		attachments: enrichedMessage.attachments,
		reactions: enrichedMessage.reactions,
		solutions: hideSolutions ? [] : enrichedMessage.solutions,
		metadata: enrichedMessage.metadata,
		showCard,
	};

	return <DiscordMessageComponent {...componentProps} />;
}
