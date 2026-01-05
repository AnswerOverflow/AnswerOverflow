import type { Message } from "discord.js";

export function isHumanMessage(_message: Message): boolean {
	return true;
}

export function removeDiscordMarkdown(text: string): string {
	return text.replace(/(\*|_|~|`)/g, "");
}
