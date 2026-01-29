"use client";

import { ChatInterface } from "./chat-interface";
import { useFeaturedServers } from "./featured-servers-provider";

type ChatPageHandlerProps = {
	serverDiscordId?: string;
	initialQuery?: string;
};

export function ChatPageHandler({
	serverDiscordId,
	initialQuery,
}: ChatPageHandlerProps) {
	const featuredServers = useFeaturedServers();

	const initialServer =
		serverDiscordId && featuredServers
			? featuredServers.find((s) => s.discordId === serverDiscordId)
			: undefined;

	return (
		<ChatInterface initialServer={initialServer} initialInput={initialQuery} />
	);
}
