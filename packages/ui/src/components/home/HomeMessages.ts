import type { MessageProps } from '../home/DemoMessage';

export interface HomeMessages {
	questionMessage: MessageProps;
	answerMessage: MessageProps;
}

export const messageData: HomeMessages = {
	questionMessage: {
		message: {
			content: 'How do I index my discord channels into google?',
			id: '1063028763656458270',
			author: {
				name: 'Jolt',
				id: '0',
				avatar: null,
			},

			public: true,
			channelId: '0',
			serverId: '0',
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
			type: 0,
			flags: 0,
			components: [],
			embeds: [],
			reactions: [],
			stickerIds: [],
			webhookId: null,
			tts: false,
			interactionId: null,
		},
		customMessageDateString: 'Today at 15:31',
		alt: 'Jolt',
		src: '/jolt_icon.png',
	},

	answerMessage: {
		message: {
			content:
				'Hey @Jolt, you can use Answer Overflow to do that! Learn more at answeroverflow.com!',
			id: '1063028763656458270',
			author: {
				name: 'Rhys',
				id: '0',
				avatar: null,
			},
			parentChannelId: null,
			public: true,
			channelId: '0',
			serverId: '0',
			attachments: [],
			applicationId: null,
			messageReference: null,
			childThreadId: null,
			solutionIds: [],
			mentions: [],
			mentionRoles: [],
			mentionChannels: [],
			mentionEveryone: false,
			nonce: null,
			pinned: false,
			type: 0,
			flags: 0,
			components: [],
			embeds: [],
			reactions: [],
			stickerIds: [],
			webhookId: null,
			tts: false,
			interactionId: null,
		},
		alt: 'Rhys',
		src: '/rhys_icon.png',
		customMessageDateString: 'Today at 15:45',
	},
};
