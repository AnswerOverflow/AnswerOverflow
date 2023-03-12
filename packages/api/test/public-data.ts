import {
	DiscordAccount,
	getDefaultDiscordAccount,
	getDefaultMessage,
	isMessageFull,
	Message,
	MessageFull,
	MessageWithDiscordAccount,
	Server,
} from '@answeroverflow/db';
import { omit, pick } from '@answeroverflow/utils';
import type { ChannelFindByIdOutput } from '~api/utils/types';

export function pickPublicServerData(server: Server) {
	return pick(server, ['id', 'name', 'icon', 'description']);
}

type ToMessageWithDiscordAccount = {
	message: Message;
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
		solutionMessages: solutions,
		referencedMessage: referenced ?? null,
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
	};
	if (isReply) {
		return privateMsg;
	}
	return {
		...privateMsg,
		referencedMessage: message.referencedMessage
			? toPrivateMessageWithStrippedData(message.referencedMessage)
			: null,
		solutionMessages: message.solutionMessages.map((m) =>
			toPrivateMessageWithStrippedData(m),
		),
	};
}

export function pickPublicChannelData(channel: ChannelFindByIdOutput) {
	const picked = pick(channel, [
		'id',
		'name',
		'parentId',
		'serverId',
		'type',
		'inviteCode',
	]);
	return picked;
}
