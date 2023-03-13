import { getRandomId } from '@answeroverflow/utils';
import { getDefaultMessage } from './default';
import type { Message } from './elastic';

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
			parentChannelId: null,
			images: [],
			messageReference: null,
			childThread: null,
			solutionIds: [],
		} satisfies Message);
	});
});
