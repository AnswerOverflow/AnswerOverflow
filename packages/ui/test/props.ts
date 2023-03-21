import type {
	ChannelPublicWithFlags,
	DiscordAccountPublic,
	APIMessageWithDiscordAccount,
	ServerPublic,
} from '@answeroverflow/api';
import { getRandomSentence } from '@answeroverflow/utils';

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

export function mockServer(override: Partial<ServerPublic> = {}) {
	const data: ServerPublic = {
		id: randomId(),
		name: 'Test Server',
		icon: null,
		description: null,
		...override,
	};
	return data;
}

export function mockChannel(override: Partial<ChannelPublicWithFlags> = {}) {
	const data: ChannelPublicWithFlags = {
		id: randomId(),
		name: 'general',
		serverId: '0',
		parentId: null,
		type: 0,
		inviteCode: null,
		...override,
	};
	return data;
}

export function mockChannelWithSettings(
	override: Partial<ChannelPublicWithFlags> = {},
) {
	const data: ChannelPublicWithFlags = {
		id: randomId(),
		name: 'general',
		serverId: '0',
		parentId: null,
		type: 0,
		inviteCode: randomId(),
		...override,
	};
	return data;
}
