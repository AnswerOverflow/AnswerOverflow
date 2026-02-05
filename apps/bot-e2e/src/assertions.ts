import type { Client, Message, ThreadChannel } from "discord.js-selfbot-v13";

interface WaitForOptions {
	timeout?: number;
	interval?: number;
}

async function waitForBotReply(
	thread: ThreadChannel,
	botId: string,
	options: WaitForOptions = {},
): Promise<Message | null> {
	const { timeout = 10000, interval = 500 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const messages = await thread.messages.fetch({ limit: 10 });
		const botMessage = messages.find((m) => m.author.id === botId);
		if (botMessage) {
			return botMessage;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	return null;
}

async function waitForReaction(
	message: Message,
	emoji: string,
	options: WaitForOptions = {},
): Promise<boolean> {
	const { timeout = 10000, interval = 500 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const freshMessage = await message.fetch(true);
		const reaction = freshMessage.reactions.cache.find(
			(r) => r.emoji.name === emoji,
		);
		if (reaction && reaction.count > 0) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	return false;
}

async function waitForThreadTag(
	thread: ThreadChannel,
	tagId: string,
	options: WaitForOptions = {},
): Promise<boolean> {
	const { timeout = 10000, interval = 500 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const freshThread = (await thread.fetch(true)) as ThreadChannel;
		if (freshThread.appliedTags?.includes(tagId)) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	return false;
}

async function waitForCondition<T>(
	check: () => Promise<T | null | undefined>,
	options: WaitForOptions = {},
): Promise<T | null> {
	const { timeout = 10000, interval = 500 } = options;
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		const result = await check();
		if (result) {
			return result;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}

	return null;
}

export { waitForBotReply, waitForReaction, waitForThreadTag, waitForCondition };
export type { WaitForOptions };
