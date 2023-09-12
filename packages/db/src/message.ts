/*
 This file is bad, there's a lot of optimization to be had in the database queries
 If you'd like to take a crack at it please do
*/

import { z } from 'zod';
import { DBError } from './utils/error';
import {
	findIgnoredDiscordAccountById,
	findManyIgnoredDiscordAccountsById,
} from './ignored-discord-account';
import {
	findManyUserServerSettings,
	findUserServerSettingsById,
} from './user-server-settings';
import { findAllThreadsByParentId } from './channel';
import { ServerWithFlags } from './zodSchemas/serverSchemas';
import { ChannelWithFlags } from './zodSchemas/channelSchemas';
import { db } from './db';
import {
	BaseMessage,
	BaseMessageWithRelations,
	DiscordAccount,
	dbMessages,
	Server,
	UserServerSettings,
	dbAttachments,
	dbReactions,
	dbEmojis,
} from './schema';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import { addFlagsToUserServerSettings } from './utils/userServerSettingsUtils';
import { addFlagsToServer } from './utils/serverUtils';
import { getRandomId, pick } from '@answeroverflow/utils';
import { zDiscordAccountPublic } from './zodSchemas/discordAccountSchemas';
import { anonymizeDiscordAccount } from './utils/anonymization';
import { MessageSearchOptions } from '@answeroverflow/elastic-types';
import { createInsertSchema } from 'drizzle-zod';

export const zFindMessagesByChannelId = z.object({
	channelId: z.string(),
	after: z.string().optional(),
	limit: z.number().optional(),
});

export const CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE =
	'Message author is deleted, cannot upsert message';
export const CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE =
	'Message author has disabled message indexing, cannot upsert message';

type MessageWithAuthorServerSettings = BaseMessage & {
	author: DiscordAccount & {
		userServerSettings: UserServerSettings[];
	};
};

export function applyPublicFlagsToMessages<
	T extends MessageWithAuthorServerSettings & {
		solutions: MessageWithAuthorServerSettings[];
		reference?: MessageWithAuthorServerSettings;
		server: Server;
	},
>(messages: T[]) {
	if (messages.length === 0) {
		return [];
	}
	const getLookupKey = (m: { userId: string; serverId: string }) =>
		`${m.userId}-${m.serverId}`;
	const authorServerSettingsLookup = new Map(
		messages
			.flatMap((msg) => msg.author.userServerSettings)
			.map((uss) => [getLookupKey(uss), addFlagsToUserServerSettings(uss)]),
	);
	const seedLookup = new Map(messages.map((a) => [a.authorId, getRandomId()]));

	const makeMessageWithAuthor = (
		msg: MessageWithAuthorServerSettings,
		serverWithFlags: ServerWithFlags,
	) => {
		const author = msg.author;
		const seed = seedLookup.get(author.id) ?? getRandomId();
		const authorServerSettings = authorServerSettingsLookup.get(
			getLookupKey({
				serverId: msg.serverId,
				userId: author.id,
			}),
		);

		const areAllServerMessagesPublic =
			serverWithFlags.flags.considerAllMessagesPublic;
		const hasUserGrantedConsent =
			authorServerSettings?.flags.messageIndexingDisabled ?? false;
		const isMessagePublic = areAllServerMessagesPublic || hasUserGrantedConsent;

		const publicAccount = zDiscordAccountPublic.parse(author);
		return {
			...pick(
				msg,
				'content',
				'id',
				'channelId',
				'serverId',
				'parentChannelId',
				'embeds',
			),
			author:
				serverWithFlags.flags.anonymizeMessages && !isMessagePublic
					? anonymizeDiscordAccount(publicAccount, seed)
					: publicAccount,
			public: isMessagePublic,
		};
	};

	return messages.map((msg) => {
		const serverWithFlags = addFlagsToServer(msg.server);
		return {
			...makeMessageWithAuthor(msg, serverWithFlags),
			solutions: msg.solutions.map((s) =>
				makeMessageWithAuthor(s, serverWithFlags),
			),
			reference: msg.reference
				? makeMessageWithAuthor(msg.reference, serverWithFlags)
				: undefined,
		};
	});
}
export type MessageWithDiscordAccount = Awaited<
	ReturnType<typeof applyPublicFlagsToMessages>
>[number]['reference'];

export type MessageFull = Awaited<
	ReturnType<typeof applyPublicFlagsToMessages>
>[number];

export async function findMessageById(id: string) {
	return db
		.select()
		.from(dbMessages)
		.where(eq(dbMessages.id, id))
		.then((x) => x.at(0));
}

export async function findFullMessageById(id: string) {
	return db.query.dbMessages.findFirst({
		where: eq(dbMessages.id, id),
		with: {
			author: true,
			solutions: true,
			reactions: true,
			attachments: true,
		},
	});
}

export async function findMessagesByChannelId(
	input: z.infer<typeof zFindMessagesByChannelId>,
) {
	return db
		.select()
		.from(dbMessages)
		.where(
			and(
				eq(dbMessages.channelId, input.channelId),
				input.after ? gt(dbMessages.id, input.after) : undefined,
			),
		)
		.limit(input.limit ?? 100);
}

export async function findManyMessages(ids: string[]) {
	return db.select().from(dbMessages).where(inArray(dbMessages.id, ids));
}

// TODO: We want USS to only be for the server the message is in, not all servers the user is in, is that possible?
export async function findManyMessagesWithAuthors(ids: string[]) {
	if (ids.length === 0) return [];
	return db.query.dbMessages
		.findMany({
			where: inArray(dbMessages.id, ids),
			with: {
				author: {
					with: {
						userServerSettings: true,
					},
				},
				reactions: true,
				solutions: {
					with: {
						author: {
							with: {
								userServerSettings: true,
							},
						},
					},
				},
				reference: {
					with: {
						author: {
							with: {
								userServerSettings: true,
							},
						},
					},
				},
				server: true,
			},
		})
		.then((x) => applyPublicFlagsToMessages(x));
}
// TODO: Paginate get all questions response
export async function findAllChannelQuestions(input: {
	channelId: string;
	limit?: number;
	includePrivateMessages?: boolean;
	server: ServerWithFlags;
}) {
	const threads = await findAllThreadsByParentId({
		parentId: input.channelId,
		limit: input.limit,
	});

	const messages = await findManyMessagesWithAuthors(
		threads.map((thread) => thread.id),
	);

	const messagesLookup = new Map(
		messages.map((message) => [message.id, message]),
	);
	const filteredThreads = threads.filter((thread) => {
		const message = messagesLookup.get(thread.id);
		if (!message) return false;
		return input.includePrivateMessages ? true : message.public;
	});

	return filteredThreads
		.map((thread) => {
			const message = messagesLookup.get(thread.id);
			return {
				thread: thread,
				message: message,
			};
		})
		.filter(Boolean);
}

export async function upsertMessage(data: BaseMessageWithRelations) {
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
	const { attachments, reactions, ...msg } = data;
	const parsed = {
		...createInsertSchema(dbMessages).parse(msg),
		embeds: msg.embeds,
	};

	await db.insert(dbMessages).values(parsed).onDuplicateKeyUpdate({
		set: parsed,
	});
	const updateAttachments = async () => {
		if (!attachments) return;
		await db.delete(dbAttachments).where(eq(dbAttachments.messageId, msg.id));
		await Promise.all(
			attachments.map((a) => {
				const p = createInsertSchema(dbAttachments).parse(a);
				return db.insert(dbAttachments).values(p).onDuplicateKeyUpdate({
					set: p,
				});
			}),
		);
	};
	const updateReactions = async () => {
		if (!reactions) return;
		await db.delete(dbReactions).where(eq(dbReactions.messageId, msg.id));
		await Promise.all(
			reactions.map((r) => {
				const p = createInsertSchema(dbReactions).parse(r.emoji);
				return db.insert(dbEmojis).values(p).onDuplicateKeyUpdate({
					set: p,
				});
			}),
		);
		await Promise.all(
			reactions.map((r) => {
				const p = createInsertSchema(dbReactions).parse(r);
				return db.insert(dbReactions).values(p).onDuplicateKeyUpdate({
					set: p,
				});
			}),
		);
	};
	await Promise.all([updateAttachments(), updateReactions()]);
}

export async function upsertManyMessages(data: BaseMessageWithRelations[]) {
	if (data.length === 0) return Promise.resolve(true);
	const authorIds = new Set(data.map((msg) => msg.authorId));

	// Todo: make one query for all of these
	const [ignoredAccounts, userServerSettings] = await Promise.all([
		findManyIgnoredDiscordAccountsById(Array.from(authorIds)),
		findManyUserServerSettings(
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
	const existingMessages = await findManyMessages(
		filteredMessages.map((msg) => msg.id),
	);
	const existingMessageIds = new Set(existingMessages.map((msg) => msg.id));
	const messagesToInsert = filteredMessages.filter(
		(msg) => !existingMessageIds.has(msg.id),
	);
	const messagesToUpdate = filteredMessages.filter((msg) =>
		existingMessageIds.has(msg.id),
	);

	// TODO: Get this all down to 1 call to the db

	await Promise.all([
		db.insert(dbMessages).values(messagesToInsert),
		...messagesToUpdate.map((msg) =>
			db.update(dbMessages).set(msg).where(eq(dbMessages.id, msg.id)),
		),
	]);
	return filteredMessages;
}

export async function deleteMessage(id: string) {
	return db.delete(dbMessages).where(eq(dbMessages.id, id));
}

export async function deleteManyMessages(ids: string[]) {
	return db.delete(dbMessages).where(inArray(dbMessages.id, ids));
}

export async function deleteManyMessagesByChannelId(channelId: string) {
	return db.delete(dbMessages).where(eq(dbMessages.channelId, channelId));
}

export async function findLatestMessageInChannel(channelId: string) {
	return db
		.select({
			// TODO: Check if this actually works, also cast to bigint
			max: sql<string>`MAX(${dbMessages.id})`,
		})
		.from(dbMessages)
		.where(eq(dbMessages.channelId, channelId))
		.limit(1);
}

export async function bulkFindLatestMessageInChannel(channelIds: string[]) {
	return elastic.batchFindLatestMessageInChannel(channelIds);
}

export function findLatestMessageInChannelAndThreads(channelId: string) {
	return elastic.findLatestMessageInChannelAndThreads(channelId);
}

export async function deleteManyMessagesByUserId(userId: string) {
	return db.delete(dbMessages).where(eq(dbMessages.authorId, userId));
}

// TODO: Would this fit better in a utils package? this package is mainly for data fetching
export function getDiscordURLForMessage(message: BaseMessage) {
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
	// return messagesWithAuthors
	// 	.map((m): SearchResult | null => {
	// 		const channel = channelLookup.get(m.parentChannelId ?? m.channelId);
	// 		const server = serverLookup.get(m.serverId);
	// 		const thread = m.parentChannelId
	// 			? channelLookup.get(m.channelId)
	// 			: undefined;
	// 		if (!channel || !server) return null;
	// 		if (!channel.flags.indexingEnabled) {
	// 			return null;
	// 		}
	// 		return {
	// 			message: m,
	// 			channel,
	// 			score: resultsLookup.get(m.id)!._score ?? 0,
	// 			server: server,
	// 			thread,
	// 		};
	// 	})
	// 	.filter((res) => res != null && res.server.kickedTime === null)
	// 	.sort((a, b) => b!.score - a!.score) as SearchResult[];
}

export async function getTotalNumberOfMessages() {
	return db
		.select({
			count: sql<string>`COUNT(${dbMessages.id})`,
		})
		.from(dbMessages)
		.then((x) => x?.at(0)?.count ?? 2000000);
}
