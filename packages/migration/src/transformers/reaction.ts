import type { Reaction } from "../db/schema";

export interface NewReaction {
	messageId: string;
	userId: string;
	emojiId: string;
}

export function transformReaction(row: Reaction): NewReaction {
	return {
		messageId: row.messageId,
		userId: row.userId,
		emojiId: row.emojiId,
	};
}
