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
	Attachment,
} from './schema';
import { and, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { addFlagsToUserServerSettings } from './utils/userServerSettingsUtils';
import { addFlagsToServer } from './utils/serverUtils';
import { getRandomId, pick } from '@answeroverflow/utils';
import { zDiscordAccountPublic } from './zodSchemas/discordAccountSchemas';
import { anonymizeDiscordAccount } from './utils/anonymization';
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
	attachments: Attachment[];
};

export function applyPublicFlagsToMessages<
	T extends MessageWithAuthorServerSettings & {
		solutions: MessageWithAuthorServerSettings[];
		reference: MessageWithAuthorServerSettings | null;
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
				'attachments',
				'parentChannelId',
				'embeds',
				'channelId',
				'childThreadId',
				'attachments',
				'embeds',
				'flags',
				'interactionId',
				'nonce',
				'parentChannelId',
				'pinned',
				'questionId',
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

export type MessageWithDiscordAccount = NonNullable<
	Awaited<ReturnType<typeof applyPublicFlagsToMessages>>[number]['reference']
>;

export type MessageFull = NonNullable<
	Awaited<ReturnType<typeof applyPublicFlagsToMessages>>[number]
>;

export function isMessageFull(
	message: MessageFull | MessageWithDiscordAccount,
): message is MessageFull {
	return 'solutions' in message;
}

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
			reactions: {
				with: {
					emoji: true,
				},
			},
			reference: true,
			attachments: true,
		},
	});
}

export async function findMessagesByChannelIdWithDiscordAccounts(
	input: z.infer<typeof zFindMessagesByChannelId>,
) {
	return db.query.dbMessages
		.findMany({
			where: and(
				eq(dbMessages.channelId, input.channelId),
				input.after ? gt(dbMessages.id, input.after) : undefined,
			),
			with: {
				author: {
					with: {
						userServerSettings: true,
					},
				},
				attachments: true,
				solutions: {
					with: {
						author: {
							with: {
								userServerSettings: true,
							},
						},
						attachments: true,
					},
				},
				reference: {
					with: {
						author: {
							with: {
								userServerSettings: true,
							},
						},
						attachments: true,
					},
				},
				server: true,
			},
			limit: input.limit ?? 100,
		})
		.then(applyPublicFlagsToMessages);
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
				attachments: true,
				solutions: {
					with: {
						author: {
							with: {
								userServerSettings: true,
							},
						},
						attachments: true,
					},
				},
				reference: {
					with: {
						author: {
							with: {
								userServerSettings: true,
							},
						},
						attachments: true,
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

export async function upsertMessage(
	data: BaseMessageWithRelations,
	opts?: {
		ignoreChecks?: boolean;
	},
) {
	if (!opts?.ignoreChecks) {
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
		await db.delete(dbAttachments).where(eq(dbAttachments.messageId, msg.id));
		if (!attachments) return;
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
		await db.delete(dbReactions).where(eq(dbReactions.messageId, msg.id));
		if (!reactions) return;
		const emojis = new Set(reactions.map((r) => r.emoji));
		await Promise.all(
			[...emojis].map((r) => {
				const p = createInsertSchema(dbEmojis).parse(r);
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

	await Promise.all(
		filteredMessages.map((msg) =>
			upsertMessage(msg, {
				ignoreChecks: true,
			}),
		),
	);
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
			max: sql<bigint>`MAX(CAST(${dbMessages.id} AS SIGNED))`,
		})
		.from(dbMessages)
		.where(eq(dbMessages.channelId, channelId))
		.limit(1)
		.then((x) => x?.at(0)?.max?.toString());
}

export async function bulkFindLatestMessageInChannel(channelIds: string[]) {
	return db
		.select({
			latestMessageId: sql<bigint>`MAX(CAST(${dbMessages.id} AS SIGNED))`,
			channelId: dbMessages.channelId,
		})
		.from(dbMessages)
		.where(inArray(dbMessages.channelId, channelIds))
		.groupBy(dbMessages.channelId)
		.then((x) =>
			x.map((y) => ({
				channelId: y.channelId,
				latestMessageId: y.latestMessageId?.toString(),
			})),
		);
}

export async function findLatestMessageInChannelAndThreads(channelId: string) {
	return db
		.select({
			max: sql<bigint>`MAX(CAST(${dbMessages.id} AS SIGNED))`,
		})
		.from(dbMessages)
		.where(
			or(
				eq(dbMessages.channelId, channelId),
				eq(dbMessages.parentChannelId, channelId),
			),
		)
		.limit(1)
		.then((x) => x?.at(0)?.max?.toString());
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

export async function getTotalNumberOfMessages() {
	return db
		.select({
			count: sql<string>`COUNT(${dbMessages.id})`,
		})
		.from(dbMessages)
		.then((x) => x?.at(0)?.count ?? 2000000);
}

export function getThreadIdOfMessage(message: BaseMessage): string | null {
	if (message.childThreadId) {
		return message.childThreadId;
	}
	if (message.parentChannelId) {
		return message.channelId;
	}
	return null;
}

export function getParentChannelOfMessage(message: BaseMessage): string | null {
	return message.parentChannelId ?? message.channelId;
}
