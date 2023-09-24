import type { z } from 'zod';
import {
	applyPublicFlagsToMessages,
	findManyMessagesWithAuthors,
	findMessageById,
	findMessageByIdWithDiscordAccount,
	getParentChannelOfMessage,
	getThreadIdOfMessage,
	type MessageFull,
} from './message';
import { NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD } from '@answeroverflow/constants';
import { db } from './db';
import { and, asc, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import {
	dbChannels,
	dbMessages,
	dbServers,
	dbUserServerSettings,
} from './schema';
import { zServerPublic } from './zodSchemas/serverSchemas';
import { addFlagsToServer } from './utils/serverUtils';
import {
	addFlagsToChannel,
	channelBitfieldValues,
	zChannelPublic,
} from './zodSchemas/channelSchemas';
import { ChannelType } from 'discord-api-types/v10';
import { addFlagsToUserServerSettings } from './utils/userServerSettingsUtils';

export async function findQuestionsForSitemap(serverId: string) {
	const res = await db.query.dbServers.findFirst({
		where: and(eq(dbServers.id, serverId)),
		with: {
			channels: {
				where: and(
					or(
						eq(dbChannels.type, ChannelType.GuildAnnouncement),
						eq(dbChannels.type, ChannelType.GuildText),
						eq(dbChannels.type, ChannelType.GuildForum),
					),
					sql`${dbChannels.bitfield} & ${channelBitfieldValues.indexingEnabled} > 0`,
				),
				with: {
					threads: {
						orderBy: desc(dbChannels.id),
					},
				},
			},
		},
	});

	if (!res) return null;
	const questionIds = res.channels.flatMap((c) => c.threads.map((t) => t.id));

	const questions =
		questionIds.length > 0
			? await db.query.dbMessages.findMany({
					where: and(
						eq(dbMessages.serverId, serverId),
						inArray(dbMessages.id, questionIds),
					),
					columns: {
						id: true,
						authorId: true,
					},
					with: {
						author: {
							with: {
								userServerSettings: true,
							},
						},
					},
			  })
			: [];

	const questionLookup = new Map(questions.map((m) => [m.id, m]));
	const areAllServerMessagesPublic =
		addFlagsToServer(res).flags.considerAllMessagesPublic;
	return {
		questions: res.channels.flatMap((c) =>
			c.threads
				.map((t) => {
					const question = questionLookup.get(t.id);
					// Drizzle doesn't mark relations as optional, so we have to do this
					if (
						!question ||
						!question.author ||
						!question.author.userServerSettings
					)
						return null;
					const uss = question.author.userServerSettings.find(
						(uss) => uss.serverId === res.id,
					);
					if (!uss) return null;
					const wFlags = addFlagsToUserServerSettings(uss);
					const isPublic =
						wFlags.flags.canPubliclyDisplayMessages ||
						areAllServerMessagesPublic;
					if (!isPublic) return null;
					return {
						thread: t,
						message: question,
					};
				})
				.filter(Boolean),
		),
		server: res,
	};
}

export async function findServerWithCommunityPageData(opts: {
	idOrVanityUrl: string;
	limit?: number;
}) {
	const { idOrVanityUrl, limit } = opts;
	let serverId = idOrVanityUrl;
	try {
		BigInt(idOrVanityUrl);
	} catch (e) {
		const found = await db.query.dbServers.findFirst({
			where: eq(dbServers.vanityUrl, idOrVanityUrl),
		});
		if (!found) return null;
		serverId = found.id;
	}

	const found = await db.query.dbServers.findFirst({
		where: eq(dbServers.id, serverId),
		with: {
			channels: {
				where: and(
					or(
						eq(dbChannels.type, ChannelType.GuildAnnouncement),
						eq(dbChannels.type, ChannelType.GuildText),
						eq(dbChannels.type, ChannelType.GuildForum),
					),
					sql`${dbChannels.bitfield} & ${channelBitfieldValues.indexingEnabled} > 0`,
				),
				with: {
					threads: {
						limit: 200,
						orderBy: desc(dbChannels.id),
					},
				},
			},
		},
	});

	if (!found || found.kickedTime != null) return null;
	const msgs = await findManyMessagesWithAuthors(
		found.channels.flatMap((c) => c.threads.map((t) => t.id)),
		{
			excludePrivateMessages: true,
		},
	);

	const server = addFlagsToServer(found);
	const serverPublic = zServerPublic.parse(server);

	const questionLookup = new Map<
		string,
		{
			message: MessageFull;
			thread: z.infer<typeof zChannelPublic>;
		}[]
	>();

	const threadMessageLookup = new Map(
		msgs.map((m) => [getThreadIdOfMessage(m), m]),
	);

	found.channels.forEach((channel) => {
		const settings = addFlagsToChannel(channel);
		if (!settings.flags.indexingEnabled) return;
		channel.threads.forEach((thread) => {
			const threadMessage = threadMessageLookup.get(thread.id);
			if (!threadMessage) return;
			if (!questionLookup.has(channel.id)) {
				questionLookup.set(channel.id, [
					{
						message: threadMessage,
						thread: zChannelPublic.parse(thread),
					},
				]);
			} else {
				questionLookup.get(channel.id)?.push({
					message: threadMessage,
					thread: zChannelPublic.parse(thread),
				});
			}
		});
	});

	const channelsWithQuestions = found.channels
		.map((c) => {
			const questions = questionLookup.get(c.id) ?? [];
			return {
				channel: zChannelPublic.parse(c),
				questions: questions
					.sort((a, b) => {
						const aDate = BigInt(a.thread.id);
						const bDate = BigInt(b.thread.id);
						if (aDate > bDate) return -1;
						if (aDate < bDate) return 1;
						return 0;
					})
					.slice(0, limit),
			};
		})
		.filter(Boolean);

	return {
		server: serverPublic,
		channels: channelsWithQuestions,
	};
}

export type CommunityPageData = NonNullable<
	Awaited<ReturnType<typeof findServerWithCommunityPageData>>
>;

export async function findMessageResultPage(messageId: string) {
	const targetMessage = await findMessageById(messageId);
	if (!targetMessage) {
		return null;
	}
	// Declare as const to make Typescript not yell at us when used in arrow functions
	const threadId = getThreadIdOfMessage(targetMessage);
	// TODO: These should maybe be a different error code
	const parentId = getParentChannelOfMessage(targetMessage);

	if (!parentId) {
		return null;
	}

	if (!threadId) {
		return null; // temporarily disabled while we fix a bug with text channels
	}

	const startTime = Date.now();

	const [result, rootMessage] = await Promise.all([
		db.query.dbChannels.findFirst({
			where: eq(dbChannels.id, threadId ?? parentId),
			with: {
				server: true,
				parent: true,
				messages: {
					where: !threadId ? gte(dbMessages.id, targetMessage.id) : undefined,
					orderBy: asc(dbMessages.id),
					limit: !threadId ? NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD : undefined,
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
								userServerSettings: {
									where: eq(
										dbUserServerSettings.serverId,
										targetMessage.serverId,
									),
								},
							},
						},
						attachments: true,
						reference: {
							with: {
								author: {
									with: {
										userServerSettings: {
											where: eq(
												dbUserServerSettings.serverId,
												targetMessage.serverId,
											),
										},
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
						reactions: true,
						solutions: {
							with: {
								author: {
									with: {
										userServerSettings: {
											where: eq(
												dbUserServerSettings.serverId,
												targetMessage.serverId,
											),
										},
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
					},
				},
			},
		}),
		threadId ? findMessageByIdWithDiscordAccount(threadId) : undefined,
	]);

	const endTime = Date.now();
	console.log(
		`findMessageResultPage /m/${messageId} took ${endTime - startTime}ms`,
	);

	if (!result) {
		return null;
	}
	const { messages, server, ...channel } = result;

	const msgsWithAccounts = applyPublicFlagsToMessages(
		messages.map((m) => ({
			...m,
			server,
		})),
	);

	const parentChannel = addFlagsToChannel(channel?.parent ?? channel);
	if (!server || server.kickedTime) return null;

	if (!parentChannel || !parentChannel.flags.indexingEnabled) {
		return null;
	}

	const combinedMessages =
		rootMessage && !msgsWithAccounts.find((m) => m.id === rootMessage?.id)
			? [rootMessage, ...msgsWithAccounts]
			: msgsWithAccounts;

	return {
		server: addFlagsToServer(server),
		channel: parentChannel,
		messages: combinedMessages,
		rootMessage,
		thread: channel?.parent ? addFlagsToChannel(channel) : null,
	};
}
