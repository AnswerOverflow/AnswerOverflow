import { MessageType } from 'discord-api-types/v10';
import type { Message } from './message';

export function getDefaultMessage(
	override: Partial<Message> & {
		id: string;
		channelId: string;
		serverId: string;
		authorId: string;
	},
): Message {
	const data: Message = {
		content: '',
		attachments: [],
		applicationId: null,
		messageReference: null,
		childThreadId: null,
		parentChannelId: null,
		solutionIds: [],
		mentions: [],
		mentionRoles: [],
		mentionChannels: [],
		mentionEveryone: false,
		nonce: null,
		pinned: false,
		type: MessageType.Default,
		flags: 0,
		components: [],
		embeds: [],
		reactions: [],
		stickerIds: [],
		webhookId: null,
		tts: false,
		interactionId: null,
		...override,
	};
	return data;
}
