import type {
	ChannelPublicWithFlags,
	DiscordAccountPublic,
	MessageWithDiscordAccount,
	ServerPublic,
} from '@answeroverflow/api';
import { getDefaultMessage } from '@answeroverflow/elastic-types';
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
	override: Partial<MessageWithDiscordAccount> = {},
) {
	const data: MessageWithDiscordAccount = {
		...getDefaultMessage({
			id: randomId(),
			channelId: '0',
			serverId: '0',
			authorId: '0',
		}),
		content: 'Hello, world!',
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
		inviteCode: null,
		...override,
	};
	return data;
}
