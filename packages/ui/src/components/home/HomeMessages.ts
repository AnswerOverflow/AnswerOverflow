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
			parentChannelId: null,
			public: true,
			images: [],
			channelId: '0',
			serverId: '0',
			solutionIds: [],
			childThread: null,
			messageReference: null,
		},
		customMessageDateString: 'Today at 15:31',
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
			images: [],
			channelId: '0',
			serverId: '0',
			solutionIds: [],
			childThread: null,
			messageReference: null,
		},
		customMessageDateString: 'Today at 15:45',
	},
};
