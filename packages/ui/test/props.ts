import type {
	ChannelPublicWithFlags,
	DiscordAccountPublic,
	APIMessageWithDiscordAccount,
	ServerPublic,
	APIMessageFull,
} from '@answeroverflow/api';
import { getRandomName, getRandomSentence } from '@answeroverflow/utils';
import { ServerWithFlags } from '@answeroverflow/db';
import { ChannelType } from '~ui/utils/discord';

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

export function mockMessageFull(override: Partial<APIMessageFull> = {}) {
	const data: APIMessageFull = {
		...mockMessageWithDiscordAccount(),
		referencedMessage: null,
		solutionMessages: [],
		...override,
	};
	return data;
}

export function mockMessageWithDiscordAccount(
	override: Partial<APIMessageWithDiscordAccount> = {},
): APIMessageWithDiscordAccount {
	const data: APIMessageWithDiscordAccount = {
		channelId: '0',
		id: randomId(),
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
		content: getRandomSentence(),
		author: mockDiscordAccount(),
		public: true,
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
		customDomain: null,
		...override,
	};
	return data;
}

export function mockServer(override: Partial<ServerWithFlags> = {}) {
	const data: ServerWithFlags = {
		id: randomId(),
		name: 'Test Server',
		icon: null,
		description: null,
		vanityUrl: null,
		kickedTime: null,
		customDomain: null,
		flags: {
			readTheRulesConsentEnabled: false,
      consentRequiredToDisplayMessagesDisabled: false,
		},
		plan: 'FREE',
		stripeCustomerId: null,
		stripeSubscriptionId: null,
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
