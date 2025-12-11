"use client";

import type { EnrichedMessage } from "@packages/database/convex/shared/shared";
import { DiscordMessage } from "./discord-message";
import { Link } from "./link";

export type MessagePreviewCardProps = {
	enrichedMessage: EnrichedMessage;
	href: string;
	ariaLabel?: string;
};

export function MessagePreviewCardBody({
	enrichedMessage,
	href,
	ariaLabel,
}: MessagePreviewCardProps) {
	const defaultAriaLabel = `Open message ${enrichedMessage.message.content?.slice(0, 30) || ""}`;

	return (
		<div className="group relative hover:bg-accent/50 transition-colors">
			<Link
				href={href}
				className="absolute inset-0 z-0"
				aria-label={ariaLabel ?? defaultAriaLabel}
			/>
			<div className="relative z-10 pointer-events-none [&_a]:pointer-events-auto p-4">
				<div className="relative max-h-64 overflow-hidden mask-[linear-gradient(to_bottom,black_0,black_12rem,transparent_16rem)]">
					<DiscordMessage
						enrichedMessage={enrichedMessage}
						showCard={false}
						hideSolutions
					/>
				</div>
			</div>
		</div>
	);
}

export function MessagePreviewCard(props: MessagePreviewCardProps) {
	return (
		<div className="rounded-lg border border-border bg-card overflow-hidden">
			<MessagePreviewCardBody {...props} />
		</div>
	);
}
