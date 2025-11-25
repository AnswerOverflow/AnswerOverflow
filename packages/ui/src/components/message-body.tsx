"use client";

import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import { DiscordUIMessage } from "./discord-message/renderer";
import type { MessageWithMetadata } from "./discord-message/types";

export function MessageBody(props: {
	message: EnrichedMessage;
	collapseContent?: boolean;
	loadingStyle?: "eager" | "lazy";
}) {
	const { message } = props;

	const messageWithMetadata: MessageWithMetadata = {
		...message.message,
		attachments: message.attachments,
		embeds: message.message.embeds,
		metadata: message.metadata ?? null,
		poll: null,
		snapshot: null,
		user: message.author ? { isIgnored: false } : null,
		isIgnored: false,
	};

	return (
		<div className="flex flex-col gap-2">
			<DiscordUIMessage message={messageWithMetadata} />
		</div>
	);
}
