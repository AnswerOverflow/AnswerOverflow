/*
 This file is bad, there's a lot of optimization to be had in the database queries
 If you'd like to take a crack at it please do
*/

import { getRandomId } from '@answeroverflow/utils/id';
import { pick } from '@answeroverflow/utils/select';
import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { findAllThreadsByParentId } from './channel';
import { db, dbReplica } from './db';
import {
	Attachment,
	BaseMessage,
	DiscordAccount,
	Server,
	UserServerSettings,
	dbChannels,
	dbMessages,
} from './schema';
import { anonymizeDiscordAccount } from './utils/anonymization';
import { addFlagsToServer } from './utils/serverUtils';
import { addFlagsToUserServerSettings } from './utils/userServerSettingsUtils';
import { zDiscordAccountPublic } from './zodSchemas/discordAccountSchemas';
import { ServerWithFlags } from './zodSchemas/serverSchemas';

export const zFindMessagesByChannelId = z.object({
	channelId: z.string(),
	after: z.string().optional(),
	limit: z.number().optional(),
});

export const CANNOT_UPSERT_MESSAGE_FOR_IGNORED_ACCOUNT_MESSAGE =
	'Message author is deleted, cannot upsert message';
export const CANNOT_UPSERT_MESSAGE_FOR_USER_WITH_MESSAGE_INDEXING_DISABLED_MESSAGE =
	'Message author has disabled message indexing, cannot upsert message';

type MessageWithAuthorServerSettings = Pick<
	BaseMessage,
	| 'id'
	| 'content'
	| 'questionId'
	| 'serverId'
	| 'authorId'
	| 'channelId'
	| 'parentChannelId'
	| 'childThreadId'
	| 'embeds'
> & {
	author: DiscordAccount & {
		userServerSettings: UserServerSettings[];
	};
	attachments: Attachment[];
};

export function applyPublicFlagsToMessages<
	T extends MessageWithAuthorServerSettings & {
		solutions: MessageWithAuthorServerSettings[];
		reference: MessageWithAuthorServerSettings | null;
		server: Pick<Server, 'bitfield'>;
	},
>(messages: T[]) {
	if (messages.length === 0) {
		return [];
	}

	const getLookupKey = (m: { userId: string; serverId: string }) =>
		`${m.userId}-${m.serverId}`;

	// TODO: Ew 🤮
	const authorServerSettingsLookup = new Map(
		messages
			.filter((msg) => msg.author && msg.author.userServerSettings)
			.flatMap((msg) => [
				...msg.author.userServerSettings,
				...msg.solutions.flatMap((s) => s.author.userServerSettings),
				...(msg?.reference?.author.userServerSettings ?? []),
			])
			.map((uss) => [getLookupKey(uss), addFlagsToUserServerSettings(uss)]),
	);
	const seedLookup = new Map(messages.map((a) => [a.authorId, getRandomId()]));

	const makeMessageWithAuthor = (
		msg: MessageWithAuthorServerSettings,
		serverWithFlags: Pick<ServerWithFlags, 'flags'>,
	) => {
		if (!msg.author || !msg.author.userServerSettings) {
			return null;
		}
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
			authorServerSettings?.flags.canPubliclyDisplayMessages ?? false;
		const isMessagePublic = areAllServerMessagesPublic || hasUserGrantedConsent;
		const publicAccount = zDiscordAccountPublic.parse(author);
		const isAnonymous =
			serverWithFlags.flags.anonymizeMessages &&
			!authorServerSettings?.flags.canPubliclyDisplayMessages;
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
				'parentChannelId',
				'questionId',
			),
			author: isAnonymous
				? anonymizeDiscordAccount(publicAccount, seed)
				: publicAccount,
			isAnonymous,
			public: isMessagePublic,
		};
	};

	return messages
		.map((msg) => {
			const serverWithFlags = addFlagsToServer(msg.server);
			const withAuthor = makeMessageWithAuthor(msg, serverWithFlags);
			if (!withAuthor) return null;
			return {
				...withAuthor,
				solutions: msg.solutions
					.map((s) => makeMessageWithAuthor(s, serverWithFlags))
					.filter(Boolean),
				reference: msg.reference
					? makeMessageWithAuthor(msg.reference, serverWithFlags)
					: null,
			};
		})
		.filter(Boolean);
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

export async function findMessageByIdWithDiscordAccount(id: string) {
	return dbReplica.query.dbMessages
		.findFirst({
			where: eq(dbMessages.id, id),
			columns: {
				id: true,
				content: true,
				questionId: true,
				serverId: true,
				authorId: true,
				channelId: true,
				parentChannelId: true,
				childThreadId: true,
				embeds: true,
			},
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
					columns: {
						id: true,
						content: true,
						questionId: true,
						serverId: true,
						authorId: true,
						channelId: true,
						parentChannelId: true,
						childThreadId: true,
						embeds: true,
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
					columns: {
						id: true,
						content: true,
						questionId: true,
						serverId: true,
						authorId: true,
						channelId: true,
						parentChannelId: true,
						childThreadId: true,
						embeds: true,
					},
				},
				server: {
					columns: {
						bitfield: true,
					},
				},
			},
		})
		.then((x) => (x ? applyPublicFlagsToMessages([x])[0]! : null));
}

export async function findFullMessageById(id: string) {
	return dbReplica.query.dbMessages.findFirst({
		where: eq(dbMessages.id, id),
		columns: {
			id: true,
			content: true,
			questionId: true,
			serverId: true,
			authorId: true,
			channelId: true,
			parentChannelId: true,
			childThreadId: true,
			embeds: true,
		},
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
	return dbReplica.query.dbMessages
		.findMany({
			where: and(
				eq(dbMessages.channelId, input.channelId),
				// @ts-expect-error
				input.after ? gte(dbMessages.id, BigInt(input.after)) : undefined,
			),
			columns: {
				id: true,
				content: true,
				questionId: true,
				serverId: true,
				authorId: true,
				channelId: true,
				parentChannelId: true,
				childThreadId: true,
				embeds: true,
			},
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
					columns: {
						id: true,
						content: true,
						questionId: true,
						serverId: true,
						authorId: true,
						channelId: true,
						parentChannelId: true,
						childThreadId: true,
						embeds: true,
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
					columns: {
						id: true,
						content: true,
						questionId: true,
						serverId: true,
						authorId: true,
						channelId: true,
						parentChannelId: true,
						childThreadId: true,
						embeds: true,
					},
				},
				server: {
					columns: {
						bitfield: true,
					},
				},
			},
			limit: input.limit ?? 100,
		})
		.then(applyPublicFlagsToMessages);
}

export async function findManyMessages(ids: string[]) {
	if (ids.length === 0) return [];
	return dbReplica.select().from(dbMessages).where(inArray(dbMessages.id, ids));
}

// TODO: We want USS to only be for the server the message is in, not all servers the user is in, is that possible?
export async function findManyMessagesWithAuthors(
	ids: string[],
	opts?: {
		excludePrivateMessages?: boolean;
	},
): Promise<MessageFull[]> {
	if (ids.length === 0) return [];
	const msgs = await dbReplica.query.dbMessages
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
	const msgLookup = new Map(msgs.map((msg) => [msg.id, msg]));
	return ids
		.map((id) => msgLookup.get(id))
		.filter((x) => {
			if (!x) return false;
			if (opts?.excludePrivateMessages) {
				return x.public;
			}
			return true;
		}) as MessageFull[];
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

export async function deleteMessage(id: string) {
	return db.delete(dbMessages).where(eq(dbMessages.id, id));
}

export async function deleteManyMessages(ids: string[]) {
	if (ids.length === 0) return Promise.resolve();
	return db.delete(dbMessages).where(inArray(dbMessages.id, ids));
}

export async function deleteManyMessagesByChannelId(channelId: string) {
	return db.delete(dbMessages).where(eq(dbMessages.channelId, channelId));
}

export async function bulkFindLatestMessageInChannel(channelIds: string[]) {
	if (channelIds.length === 0) return [];
	return db
		.select({
			latestMessageId: dbChannels.lastIndexedSnowflake,
			channelId: dbChannels.id,
		})
		.from(dbChannels)
		.where(inArray(dbChannels.id, channelIds))
		.groupBy(dbChannels.id);
}

export async function findLatestMessageInChannelAndThreads(channelId: string) {
	const id = await db
		.select({
			max: sql<bigint>`MAX(${dbMessages.id})`,
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
	if (!id) return null;
	return findMessageById(id);
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
		.then((x) => (x?.at(0)?.count ? Number(x?.at(0)?.count) : 2000000));
}

export function getThreadIdOfMessage(
	message: Pick<BaseMessage, 'childThreadId' | 'parentChannelId' | 'channelId'>,
): string | null {
	if (message.childThreadId) {
		return message.childThreadId;
	}
	if (message.parentChannelId) {
		return message.channelId;
	}
	return null;
}

export function getParentChannelOfMessage(message: BaseMessage) {
	return message.parentChannelId ?? message.channelId;
}

export async function findManyMessageWithRelations(ids: readonly string[]) {
	const start = Date.now();
	const messages = await dbReplica.query.dbMessages.findMany({
		where: inArray(dbMessages.id, ids as string[]),
		columns: {
			id: true,
			content: true,
			questionId: true,
			serverId: true,
			authorId: true,
			channelId: true,
			parentChannelId: true,
			childThreadId: true,
			embeds: true,
		},
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
				columns: {
					id: true,
					content: true,
					questionId: true,
					serverId: true,
					authorId: true,
					channelId: true,
					parentChannelId: true,
					childThreadId: true,
					embeds: true,
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
				columns: {
					id: true,
					content: true,
					questionId: true,
					serverId: true,
					authorId: true,
					channelId: true,
					parentChannelId: true,
					childThreadId: true,
					embeds: true,
				},
			},
			server: true,
			channel: {
				with: {
					parent: true,
				},
			},
		},
	});
	const end = Date.now();
	console.log(`findManyMessageWithRelations took ${end - start}ms`);
	const lookUp = new Map(
		messages.map((msg) => {
			const parent = msg?.channel?.parent;
			if (!parent || !addFlagsToChannel(parent).flags.indexingEnabled)
				return [msg.id, undefined];
			return [
				msg.id,
				{
					server: stripPrivateServerData(addFlagsToServer(msg.server)),
					channel: stripPrivateChannelData(addFlagsToChannel(msg.channel)),
					parent: stripPrivateChannelData(addFlagsToChannel(parent)),
					message: applyPublicFlagsToMessages([msg])[0]!,
				},
			];
		}),
	);
	return ids.map((id) => lookUp.get(id));
}

import Dataloader from 'dataloader';
import { stripPrivateChannelData, stripPrivateServerData } from './permissions';
import { addFlagsToChannel } from './zodSchemas/channelSchemas';

export const messages = new Dataloader(findManyMessageWithRelations);
