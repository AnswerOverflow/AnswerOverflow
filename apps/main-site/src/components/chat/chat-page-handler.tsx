"use client";

import { parseAsString, useQueryState } from "nuqs";
import { ChatInterface } from "./chat-interface";
import { useFeaturedServers } from "./featured-servers-provider";

export function ChatPageSkeleton() {
	return (
		<div className="flex-1 flex flex-col">
			<div className="flex-1 flex items-center justify-center">
				<div className="animate-pulse text-muted-foreground">
					Loading chat...
				</div>
			</div>
		</div>
	);
}

export function ChatPageHandler() {
	const featuredServers = useFeaturedServers();
	const [serverDiscordId] = useQueryState("server", parseAsString);
	const [initialQuery] = useQueryState("q", parseAsString);

	const initialServer =
		serverDiscordId && featuredServers
			? featuredServers.find((s) => s.discordId === serverDiscordId)
			: undefined;

	return (
		<ChatInterface
			initialServer={initialServer}
			initialInput={initialQuery ?? undefined}
		/>
	);
}
