import { ButtonBuilder, ButtonStyle } from "discord.js";

export const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";

export const DISMISS_ACTION_PREFIX = "dismiss";
export const DISMISS_BUTTON_LABEL = "Dismiss";

export const SIMILAR_THREADS_ACTION_PREFIX = "similar-threads";
export const SIMILAR_THREADS_BUTTON_LABEL = "View Similar Threads";

export const SIMILAR_THREAD_SOLVED_ACTION_PREFIX = "similar-thread-solved";
export const SIMILAR_THREAD_SOLVED_BUTTON_LABEL = "This Solved It";

export function makeDismissButton(dismisserId: string): ButtonBuilder {
	return new ButtonBuilder({
		label: DISMISS_BUTTON_LABEL,
		style: ButtonStyle.Secondary,
		customId: `${DISMISS_ACTION_PREFIX}:${dismisserId}`,
	});
}

export const DM_REPLY_ACTION_PREFIX = "dm-reply";
export const DM_REPLY_BUTTON_LABEL = "Reply";

export function makeDmReplyButton(userId: string): ButtonBuilder {
	return new ButtonBuilder({
		label: DM_REPLY_BUTTON_LABEL,
		style: ButtonStyle.Primary,
		customId: `${DM_REPLY_ACTION_PREFIX}:${userId}`,
	});
}

export function makeSimilarThreadsButton(
	threadId: string,
	serverId: string,
): ButtonBuilder {
	return new ButtonBuilder({
		label: SIMILAR_THREADS_BUTTON_LABEL,
		style: ButtonStyle.Secondary,
		customId: `${SIMILAR_THREADS_ACTION_PREFIX}:${threadId}:${serverId}`,
	});
}
