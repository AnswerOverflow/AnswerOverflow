import { z } from 'zod';
import type {
	ChannelWithFlags,
	ServerWithFlags,
} from '@answeroverflow/prisma-types';
import { zDiscordAccountPublic } from '@answeroverflow/prisma-types';
import {
	type Message,
	elastic,
	zMessage,
	type MessageSearchOptions,
} from '@answeroverflow/elastic-types';
import { DBError } from './utils/error';
import {
	findIgnoredDiscordAccountById,
	findManyIgnoredDiscordAccountsById,
} from './ignored-discord-account';
import {
	findManyUserServerSettings,
	findUserServerSettingsById,
} from './user-server-settings';
import { findManyDiscordAccountsWithUserServerSettings } from './discord-account';
import { omit } from '@answeroverflow/utils';
import { findAllThreadsByParentId, findManyChannelsById } from './channel';
import { findManyServersById } from './server';
import type { MessageProps } from '@answeroverflow/constants';
export type MessageWithDiscordAccount = z.infer<
	typeof zMessageWithDiscordAccount
>;
export const zMessageWithDiscordAccount = zMessage
	.extend({
		author: zDiscordAccountPublic,
		public: z.boolean(),
	})
	.omit({ authorId: true });

export type MessageFull = z.infer<typeof zMessageWithDiscordAccount> & {
	referencedMessage: MessageWithDiscordAccount | null;
	solutionMessages: MessageWithDiscordAccount[];
};

export function messageWithDiscordAccountToAnalyticsData(
	message: MessageFull | MessageWithDiscordAccount,
): MessageProps {
	return {
		'Channel Id': message.parentChannelId
			? message.parentChannelId
			: message.channelId,
		'Thread Id': message.childThreadId ?? undefined,
		'Server Id': message.serverId,
		'Message Author Id': message.author.id,
		'Message Id': message.id,
		'Solution Id': message.solutionIds?.[0] ?? undefined,
	};
}

export function isMessageFull(
	message: MessageWithDiscordAccount | MessageFull,
): message is MessageFull {
	return 'referencedMessage' in message && 'solutionMessages' in message;
}

export const zMessageWithAccountAndRepliesTo: z.ZodType<MessageFull> =
	zMessageWithDiscordAccount.extend({
		referencedMessage: z.lazy(() => zMessageWithDiscordAccount.nullable()),
		solutionMessages: z.lazy(() => z.array(zMessageWithDiscordAccount)),
	});

export const zFindMessagesByChannelId = z.object({
	channelId: z.string(),
	after: z.string().optional(),
	limit: z.number().optional(),
});

export async function addReferenceToMessage(message: Message) {
	return (await addReferencesToMessages([message]))[0];
}

export async function addReferencesToMessages(messages: Message[]) {
	const replyIds = messages
		.filter((m) => m.messageReference?.messageId)
		.map((m) => m.messageReference?.messageId!);
	const solutionIds = messages
		.filter((m) => m.solutionIds.length > 0)
		.flatMap((m) => m.solutionIds);
	const referencedMessages = await findManyMessages([
		...replyIds,
		...solutionIds,
	]);
	const messageLookup = new Map(referencedMessages.map((r) => [r.id, r]));
	return messages.map((m) => ({
		...m,
		referencedMessage: m.messageReference?.messageId
			? messageLookup.get(m.messageReference?.messageId)
			: null,
		solutionMessages: m.solutionIds
			.map((id) => messageLookup.get(id))
			.filter(Boolean),
	}));
}

export async function addAuthorToMessage(
	message: Awaited<ReturnType<typeof addReferencesToMessages>>[number],
  server: ServerWithFlags
) {
	return (await addAuthorsToMessages([message], [server]))[0] ?? null;
}

export async function addAuthorsToMessages(
	messages: Awaited<ReturnType<typeof addReferencesToMessages>>,
  servers: ServerWithFlags[]
): Promise<MessageFull[]> {
	if (messages.length === 0) {
		return [];
	}
  const serverLookup = new Map(servers.map((s) => [s.id, s]));
	const authorIds = new Set(messages.map((m) => m.authorId));
	const authorServers = new Set(messages.map((m) => m.serverId));
	const solutionAuthorIds = new Set(
		messages.flatMap((m) => m.solutionMessages.map((s) => s.authorId)),
	);
	const solutionServerIds = new Set(
		messages.flatMap((m) => m.solutionMessages.map((s) => s.serverId)),
	);
	const referencedAuthorIds = new Set(
		messages.flatMap((m) =>
			m.referencedMessage ? [m.referencedMessage.authorId] : [],
		),
	);
	const referencedServerIds = new Set(
		messages.flatMap((m) =>
			m.referencedMessage ? [m.referencedMessage.serverId] : [],
		),
	);
	const allAuthorIds = new Set([
		...authorIds,
		...solutionAuthorIds,
		...referencedAuthorIds,
	]);
	const allServerIds = new Set([
		...authorServers,
		...solutionServerIds,
		...referencedServerIds,
	]);
	const authors = await findManyDiscordAccountsWithUserServerSettings({
		authorIds: Array.from(allAuthorIds),
		authorServerIds: Array.from(allServerIds),
	});
	const authorServerSettingsLookup = new Map(
		authors.flatMap((a) =>
			a.userServerSettings.map((uss) => [`${a.id}-${uss.serverId}`, uss]),
		),
	);
	const authorLookup = new Map(authors.map((a) => [a.id, a]));

	const makeMessageWithAuthor = (message: Message) => {
		const author = authorLookup.get(message.authorId);
    const server = serverLookup.get(message.serverId);
		const authorServerSettings = authorServerSettingsLookup.get(
			`${message.authorId}-${message.serverId}`,
		);
		if (!author || !server) {
			return null;
		}

		return {
			...omit(message, 'authorId'),
			author: zDiscordAccountPublic.parse(author),
			public: server.flags.consentRequiredToDisplayMessagesDisabled || authorServerSettings?.flags.canPubliclyDisplayMessages || false,
		};
	};

	const fullMessages: MessageFull[] = [];
	for (const message of messages) {
		const author = authorLookup.get(message.authorId);
		if (!author) {
			continue;
		}
		const msgWithAuthor = makeMessageWithAuthor(message);
		if (!msgWithAuthor) {
			continue;
		}
		const fullMessage: MessageFull = {
			...makeMessageWithAuthor(message)!,
			referencedMessage: message.referencedMessage
				? makeMessageWithAuthor(message.referencedMessage)
				: null,
			solutionMessages: message.solutionMessages
				.map((m) => makeMessageWithAuthor(m))
				.filter(Boolean),
		};
		fullMessages.push(fullMessage);
	}
	return fullMessages;
}

export const CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE =
	'Message author is deleted, cannot upsert message';
export const CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE =
	'Message author has disabled message indexing, cannot upsert message';

export async function findMessageById(id: string) {
	return elastic.getMessage(id);
}

export async function findMessagesByChannelId(
	input: z.infer<typeof zFindMessagesByChannelId>,
) {
	return elastic.bulkGetMessagesByChannelId(
		input.channelId,
		input.after,
		input.limit,
	);
}

export async function findManyMessages(ids: string[]) {
	return elastic.bulkGetMessages(ids);
}

export async function findManyMessagesWithAuthors(
	ids: string[],
  servers: ServerWithFlags[]
): Promise<MessageFull[]> {
	const messages = await findManyMessages(ids);
	// TODO: Make work without adding references
	const withRefs = await addReferencesToMessages(messages);
	return addAuthorsToMessages(withRefs, servers);
}
// TODO: Paginate get all questions response
export async function findAllChannelQuestions(input: {
	channelId: string;
	limit?: number;
	includePrivateMessages?: boolean;
  server: ServerWithFlags
}) {
	const threads = await findAllThreadsByParentId({
		parentId: input.channelId,
		limit: input.limit,
	});

	const messages = await findManyMessagesWithAuthors(
		threads.map((thread) => thread.id), [input.server]
	);

	const messagesLookup = new Map(
		messages.map((message) => [message.id, message]),
	);
	const filteredThreads = threads.filter((thread) => {
		const message = messagesLookup.get(thread.id);
		if (!message) return false;
		return input.includePrivateMessages ? true : message.public;
	});

	const questions = filteredThreads
		.map((thread) => {
			const message = messagesLookup.get(thread.id);
			return {
				thread: thread,
				message: message,
			};
		})
		.filter(Boolean);

	return questions;
}

export async function updateMessage(data: z.infer<typeof zMessage>) {
	return elastic.updateMessage(data);
}

export async function upsertMessage(data: z.infer<typeof zMessage>) {
	const [ignoredAccount, userServerSettings] = await Promise.all([
		findIgnoredDiscordAccountById(data.authorId),
		findUserServerSettingsById({
			userId: data.authorId,
			serverId: data.serverId,
		}),
	]);
	if (ignoredAccount) {
		throw new DBError(
			CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE,
			'IGNORED_ACCOUNT',
		);
	}
	if (userServerSettings?.flags.messageIndexingDisabled) {
		throw new DBError(
			CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE,
			'MESSAGE_INDEXING_DISABLED',
		);
	}
	return await elastic.upsertMessage(data);
}

export async function upsertManyMessages(data: z.infer<typeof zMessage>[]) {
	const authorIds = new Set(data.map((msg) => msg.authorId));
	const [ignoredAccounts, userServerSettings] = await Promise.all([
		await findManyIgnoredDiscordAccountsById(Array.from(authorIds)),
		await findManyUserServerSettings(
			data.map((msg) => ({
				userId: msg.authorId,
				serverId: msg.serverId,
			})),
		),
	]);
	const userServerSettingsLookup = new Map(
		userServerSettings.map((uss) => [`${uss.userId}-${uss.serverId}`, uss]),
	);

	const ignoredAccountIds = new Set(ignoredAccounts.map((i) => i.id));
	const filteredMessages = data.filter(
		(msg) =>
			!ignoredAccountIds.has(msg.authorId) &&
			!userServerSettingsLookup.get(`${msg.authorId}-${msg.serverId}`)?.flags
				.messageIndexingDisabled,
	);
	return elastic.bulkUpsertMessages(filteredMessages);
}

export async function deleteMessage(id: string) {
	return elastic.deleteMessage(id);
}

export async function deleteManyMessages(ids: string[]) {
	return elastic.bulkDeleteMessages(ids);
}

export async function deleteManyMessagesByChannelId(channelId: string) {
	return elastic.deleteByChannelId(channelId);
}

export async function findLatestMessageInChannel(channelId: string) {
	return elastic.findLatestMessageInChannel(channelId);
}

export function findLatestMessageInChannelAndThreads(channelId: string) {
	return elastic.findLatestMessageInChannelAndThreads(channelId);
}

export async function deleteManyMessagesByUserId(userId: string) {
	return elastic.deleteByUserId(userId);
}

// TODO: Would this fit better in a utils package? this package is mainly for data fetching
export function getDiscordURLForMessage(message: Message) {
	const serverId = message.serverId;
	const channelId = message.channelId;
	const messageId = message.id;
	return `https://discord.com/channels/${serverId}/${channelId}/${messageId}`;
}

export type SearchResult = {
	message: MessageFull;
	score: number;
	channel: ChannelWithFlags;
	server: ServerWithFlags;
	thread?: ChannelWithFlags;
};

export async function searchMessages(opts: MessageSearchOptions) {
	const results = await elastic.searchMessages(opts);
	const resultsLookup = new Map(results.map((r) => [r._id, r]));
	const messages = results.map((r) => r._source);
	const channelIds = [
		...messages.map((m) => m.channelId),
		...messages.map((m) => m.parentChannelId).filter(Boolean),
	];
	const serverIds = messages.map((m) => m.serverId);
	const [channels, servers, messagesWithRefs] = await Promise.all([
		findManyChannelsById(channelIds, {
			includeMessageCount: true,
		}),
		findManyServersById(serverIds),
		addReferencesToMessages(messages),
	]);
	const messagesWithAuthors = await addAuthorsToMessages(messagesWithRefs, servers);
	const channelLookup = new Map(channels.map((c) => [c.id, c]));
	const serverLookup = new Map(
		servers.filter((x) => x.kickedTime === null).map((s) => [s.id, s]),
	);

	return messagesWithAuthors
		.map((m): SearchResult | null => {
			const channel = channelLookup.get(m.parentChannelId ?? m.channelId);
			const server = serverLookup.get(m.serverId);
			const thread = m.parentChannelId
				? channelLookup.get(m.channelId)
				: undefined;
			if (!channel || !server) return null;
			if (!channel.flags.indexingEnabled) {
				return null;
			}
			return {
				message: m,
				channel,
				score: resultsLookup.get(m.id)!._score ?? 0,
				server: server,
				thread,
			};
		})
		.filter((res) => res != null && res.server.kickedTime === null)
		.sort((a, b) => b!.score - a!.score) as SearchResult[];
}

export async function getTotalNumberOfMessages() {
	return elastic.getNumberOfIndexedMessages();
}
