import {
	type ChannelWithFlags,
	type DiscordAccount,
	getDefaultDiscordAccount,
	isMessageFull,
	type BaseMessage,
	type MessageFull,
	type MessageWithDiscordAccount,
	type Server,
} from '@answeroverflow/db';
import { omit, pick } from '@answeroverflow/utils';
import { getDefaultMessage } from '@answeroverflow/db/src/utils/message-default';

export function pickPublicServerData(server: Server) {
	return pick(
		server,
		'id',
		'name',
		'icon',
		'description',
		'vanityUrl',
		'kickedTime',
		'customDomain',
		'vanityInviteCode',
	);
}

type ToMessageWithDiscordAccount = {
	message: BaseMessage;
	author: DiscordAccount;
	publicMessage: boolean;
};

export function toMessageWithDiscordAccount({
	message,
	author,
	publicMessage,
}: ToMessageWithDiscordAccount) {
	const msg: MessageWithDiscordAccount = {
		...omit(message, 'authorId'),
		author,
		public: publicMessage,
		embeds: [],
		attachments: [],
	};
	return msg;
}

export function toMessageWithAccountAndRepliesTo({
	message,
	referenced = undefined,
	author,
	publicMessage,
	solutions = [],
}: ToMessageWithDiscordAccount & {
	referenced?: MessageWithDiscordAccount;
	solutions?: MessageWithDiscordAccount[];
}) {
	const publicMsg: MessageFull = {
		...toMessageWithDiscordAccount({ message, author, publicMessage }),
		solutions: solutions,
		reference: referenced,
	};
	return publicMsg;
}

export function toPrivateMessageWithStrippedData(
	message: MessageWithDiscordAccount | MessageFull,
): MessageWithDiscordAccount | MessageFull {
	const isReply = !isMessageFull(message);

	const author = getDefaultDiscordAccount({
		id: '0',
		name: 'Unknown User',
	});
	const privateMsg: MessageWithDiscordAccount = {
		...getDefaultMessage({
			authorId: author.id,
			channelId: message.channelId,
			serverId: message.serverId,
			id: message.id,
			parentChannelId: message.parentChannelId,
		}),
		author,
		public: false,
		embeds: [],
		attachments: [],
	};
	if (isReply) {
		return privateMsg;
	}
	return {
		...privateMsg,
		reference: message.reference
			? toPrivateMessageWithStrippedData(message.reference)
			: undefined,
		solutions: message.solutions.map((m) =>
			toPrivateMessageWithStrippedData(m),
		),
	};
}

export function pickPublicChannelData(channel: ChannelWithFlags) {
	const picked = pick(
		channel,
		'id',
		'name',
		'parentId',
		'serverId',
		'type',
		'archivedTimestamp',
		'inviteCode',
		'messageCount',
	);
	return picked;
}
