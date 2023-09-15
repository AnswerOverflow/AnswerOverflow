import type { ServerPublic } from '@answeroverflow/api';
import { getRandomName, getRandomSentence } from '@answeroverflow/utils';
import { ChannelType } from '~ui/utils/discord';
import { ServerWithFlags } from '@answeroverflow/db/src/zodSchemas/serverSchemas';
import { ChannelPublicWithFlags } from '@answeroverflow/db/src/zodSchemas/channelSchemas';
import { DiscordAccountPublic } from '@answeroverflow/db/src/zodSchemas/discordAccountSchemas';
import type { MessageFull } from '@answeroverflow/db';

export function randomId() {
	return Math.floor(Math.random() * 10000000).toString();
}

export function mockDiscordAccount(
	override: Partial<DiscordAccountPublic> = {},
) {
	const data: DiscordAccountPublic = {
		id: randomId(),
		name: 'John Doe',
		avatar: null,
		...override,
	};
	return data;
}

export function mockMessageFull(override: Partial<MessageFull> = {}) {
	const data: MessageFull = {
		...mockMessageWithDiscordAccount(),
		solutions: [],
		reference: undefined,
		...override,
	};
	return data;
}

export function mockMessageWithDiscordAccount(
	override: Partial<MessageFull> = {},
): MessageFull {
	const data: MessageFull = {
		channelId: '0',
		id: randomId(),
		questionId: '0',
		serverId: '0',
		attachments: [],
		childThreadId: null,
		parentChannelId: null,
		nonce: null,
		pinned: false,
		flags: 0,
		embeds: [],
		interactionId: null,
		content: getRandomSentence(),
		author: mockDiscordAccount(),
		public: true,
		solutions: [],
		reference: undefined,
		...override,
	};
	return data;
}

export function mockPublicServer(override: Partial<ServerPublic> = {}) {
	const data: ServerPublic = {
		id: randomId(),
		name: 'Test Server',
		icon: null,
		description: null,
		vanityUrl: null,
		kickedTime: null,
		vanityInviteCode: null,
		customDomain: null,
		...override,
	};
	return data;
}

export function mockServer(override: Partial<ServerWithFlags> = {}) {
	const data: ServerWithFlags = {
		id: randomId(),
		name: getRandomName(),
		icon: null,
		description: null,
		vanityUrl: null,
		kickedTime: null,
		customDomain: null,
		flags: {
			readTheRulesConsentEnabled: false,
			considerAllMessagesPublic: false,
			anonymizeMessages: false,
		},
		plan: 'FREE',
		stripeCustomerId: null,
		stripeSubscriptionId: null,
		vanityInviteCode: null,
		...override,
	};
	return data;
}

export function mockChannel(override: Partial<ChannelPublicWithFlags> = {}) {
	const data: ChannelPublicWithFlags = {
		id: randomId(),
		name: (override.type === ChannelType.PublicThread
			? getRandomSentence()
			: getRandomName()
		)
			.split(' ')
			.join('-'),
		serverId: '0',
		parentId: null,
		type: 0,
		archivedTimestamp: null,
		inviteCode: null,
		...override,
	};
	return data;
}

export function mockChannelWithSettings(
	override: Partial<ChannelPublicWithFlags> = {},
) {
	const data: ChannelPublicWithFlags = {
		...mockChannel(override),
		inviteCode: 'sxDN2rEdwD',
		...override,
	};
	return data;
}
