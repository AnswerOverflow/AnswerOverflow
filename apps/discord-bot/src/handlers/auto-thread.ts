import type { Message } from "discord.js";
import { MessageType } from "discord.js";
import { Console, Effect } from "effect";
import { ALLOWED_AUTO_THREAD_CHANNEL_TYPES } from "../constants/channel-types";
import { isHumanMessage, removeDiscordMarkdown } from "../utils/message-utils";

type ChannelWithFlags = {
	flags: {
		autoThreadEnabled: boolean;
	};
};

/**
 * Handles auto thread creation for messages in channels with autoThreadEnabled flag
 */
export function handleAutoThread(
	channelSettings: ChannelWithFlags | null,
	message: Message,
): Effect.Effect<void, unknown> {
	return Effect.gen(function* () {
		// Early return if channel settings don't exist or auto thread is disabled
		if (!channelSettings?.flags.autoThreadEnabled) {
			return;
		}

		const channelType = message.channel.type;

		// Only allow certain channel types
		if (!ALLOWED_AUTO_THREAD_CHANNEL_TYPES.has(channelType)) {
			return;
		}

		// Only process human messages
		if (!isHumanMessage(message)) {
			return;
		}

		// Only process default message types
		if (message.type !== MessageType.Default) {
			return;
		}

		// Skip if message is already in a thread
		if (message.thread) {
			return;
		}

		// Get author name (nickname or displayName)
		const authorName = message.member?.nickname ?? message.author.displayName;

		// Get thread title content
		let threadTitleContent = message.cleanContent;

		// If message has attachments but no content, use attachment name
		if (message.attachments.size > 0 && message.content.length === 0) {
			threadTitleContent = message.attachments.first()?.name ?? "Attachment";
		}

		// Remove all markdown characters
		threadTitleContent = removeDiscordMarkdown(threadTitleContent);

		// Format thread title
		let textTitle = `${authorName} - ${threadTitleContent}`;
		if (textTitle.length > 47) {
			textTitle = `${textTitle.slice(0, 47)}...`;
		}

		// Create thread
		yield* Effect.tryPromise({
			try: () =>
				message.startThread({
					name: textTitle,
					reason: "Answer Overflow auto thread",
				}),
			catch: (error) => {
				return error;
			},
		}).pipe(
			Effect.catchAll((error) => Console.error("Error in autoThread:", error)),
		);
	});
}
