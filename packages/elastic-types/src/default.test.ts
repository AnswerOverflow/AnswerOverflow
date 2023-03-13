import { getRandomId } from '@answeroverflow/utils';
import { MessageType } from 'discord-api-types/v10';
import { getDefaultMessage } from './default';
import type { Message } from './message';

describe('Default Message Values', () => {
	it('should verify message default values are correct', () => {
		const serverId = getRandomId();
		const channelId = getRandomId();
		const authorId = getRandomId();
		const messageId = getRandomId();
		const msg = getDefaultMessage({
			id: messageId,
			channelId,
			serverId,
			authorId,
		});
		expect(msg).toEqual({
			id: messageId,
			channelId,
			serverId,
			authorId,
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
		} satisfies Message);
	});
});
