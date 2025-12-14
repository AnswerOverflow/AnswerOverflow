import { ButtonBuilder, ButtonStyle } from "discord.js";

export const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";

export const DISMISS_ACTION_PREFIX = "dismiss";
export const DISMISS_BUTTON_LABEL = "Dismiss";

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
