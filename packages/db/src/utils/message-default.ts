import { MessageType } from 'discord-api-types/v10';
import type { BaseMessageWithRelations } from '../schema';

export function getDefaultMessage(
	override: Partial<BaseMessageWithRelations> & {
		id: string;
		channelId: string;
		serverId: string;
		authorId: string;
	},
): BaseMessageWithRelations {
	const data: BaseMessageWithRelations = {
		content: '',
		attachments: [],
		applicationId: null,
		childThreadId: null,
		parentChannelId: null,
		nonce: null,
		pinned: false,
		type: MessageType.Default,
		flags: 0,
		embeds: [],
		reactions: [],
		webhookId: null,
		tts: false,
		interactionId: null,
		...override,
	};
	return data;
}
