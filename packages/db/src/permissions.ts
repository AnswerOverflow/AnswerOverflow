// Kind of ugly having it take in two different types, but it's the easiest way to do it
import { MessageFull, MessageWithDiscordAccount } from './message';
import { getDefaultDiscordAccount } from './utils/discordAccountUtils';
import { getDefaultMessage } from './utils/message-default';
import { ChannelWithFlags, zChannelPublic } from './zodSchemas/channelSchemas';
import { ServerWithFlags, zServerPublic } from './zodSchemas/serverSchemas';

export type DiscordAPIServer = {
	id: string;
	name: string;
	icon: string | null;
	owner: boolean;
	permissions: number;
	features: string[];
};
export const canUserViewPrivateMessage = (
	userServers: DiscordAPIServer[] | null,
	message: MessageFull | MessageWithDiscordAccount,
) => userServers?.find((s) => s.id === message.serverId);

export function stripPrivatePartialMessageData(
	message: MessageWithDiscordAccount,
	userServers: DiscordAPIServer[] | null,
): MessageFull | MessageWithDiscordAccount {
	if (canUserViewPrivateMessage(userServers, message)) {
		return message;
	}
	const defaultAuthor = getDefaultDiscordAccount({
		id: '0',
		name: 'Unknown User',
	});
	const defaultMessage = getDefaultMessage({
		channelId: message.channelId,
		serverId: message.serverId,
		authorId: defaultAuthor.id,
		parentChannelId: message.parentChannelId,
		id: message.id,
		childThreadId: null,
	});

	return {
		...defaultMessage,
		author: defaultAuthor,
		attachments: [],
		embeds: [],
		public: false,
	};
}

export function stripPrivateFullMessageData(
	message: MessageFull,
	userServers: DiscordAPIServer[] | null,
): MessageFull {
	const defaultAuthor = getDefaultDiscordAccount({
		id: '0',
		name: 'Unknown User',
	});
	const defaultMessage = getDefaultMessage({
		channelId: message.channelId,
		serverId: message.serverId,
		authorId: defaultAuthor.id,
		parentChannelId: message.parentChannelId,
		id: message.id,
		childThreadId: null,
	});

	const reply = message.reference
		? stripPrivatePartialMessageData(message.reference, userServers)
		: null;

	const solutions = message.solutions.map((solution) =>
		stripPrivatePartialMessageData(solution, userServers),
	);
	if (message.public || canUserViewPrivateMessage(userServers, message)) {
		return {
			...message,
			reference: reply,
			solutions,
		};
	}
	return {
		...defaultMessage,
		author: defaultAuthor,
		public: false,
		attachments: [],
		embeds: [],
		reference: reply,
		solutions: solutions,
	};
}

export function stripPrivateChannelData(channel: ChannelWithFlags) {
	return zChannelPublic.parse(channel);
}

export function stripPrivateServerData(server: ServerWithFlags) {
	return zServerPublic.parse(server);
}
