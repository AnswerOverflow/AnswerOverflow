import type { Message } from "discord.js";

export function isHumanMessage(message: Message): boolean {
	if (message.author.bot) return false;
	if (message.author.system) return false;
	return true;
}

export function removeDiscordMarkdown(text: string): string {
	return text.replace(/(\*|_|~|`)/g, "");
}
