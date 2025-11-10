import type { Message } from "discord.js";

/**
 * Checks if a message is from a human user (not a bot or system message)
 */
export function isHumanMessage(message: Message): boolean {
	if (message.author.bot) return false;
	if (message.author.system) return false;
	return true;
}

/**
 * Removes Discord markdown characters from text
 */
export function removeDiscordMarkdown(text: string): string {
	return text.replace(/(\*|_|~|`)/g, "");
}
