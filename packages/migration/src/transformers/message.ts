import type { Embed, Message } from "../db/schema";

export interface NewMessage {
	id: string;
	authorId: string;
	serverId: string;
	channelId: string;
	parentChannelId?: string;
	childThreadId?: string;
	questionId?: string;
	referenceId?: string;
	applicationId?: string;
	interactionId?: string;
	webhookId?: string;
	content: string;
	flags?: number;
	type?: number;
	pinned?: boolean;
	nonce?: string;
	tts?: boolean;
	embeds?: Embed[];
}

export function transformMessage(row: Message): NewMessage {
	return {
		id: row.id,
		authorId: row.authorId,
		serverId: row.serverId,
		channelId: row.channelId,
		parentChannelId: row.parentChannelId ?? undefined,
		childThreadId: row.childThreadId ?? undefined,
		questionId: row.questionId ?? undefined,
		referenceId: row.referenceId ?? undefined,
		applicationId: row.applicationId ?? undefined,
		interactionId: row.interactionId ?? undefined,
		webhookId: row.webhookId ?? undefined,
		content: row.content,
		flags: row.flags ?? undefined,
		type: row.type ?? undefined,
		pinned: row.pinned ?? undefined,
		nonce: row.nonce ?? undefined,
		tts: row.tts ?? undefined,
		embeds: row.embeds ?? undefined,
	};
}
