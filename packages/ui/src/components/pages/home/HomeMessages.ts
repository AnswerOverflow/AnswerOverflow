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
			questionId: '0',
			public: true,
			channelId: '0',
			serverId: '0',
			attachments: [],
			childThreadId: null,
			parentChannelId: null,
			nonce: null,
			pinned: false,
			flags: 0,
			embeds: [],
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
			questionId: '0',
			public: true,
			channelId: '0',
			serverId: '0',
			attachments: [],
			childThreadId: null,
			nonce: null,
			pinned: false,
			flags: 0,
			embeds: [],
			interactionId: null,
		},
		alt: 'Rhys',
		src: '/rhys_icon.png',
		customMessageDateString: 'Today at 15:45',
	},
};
