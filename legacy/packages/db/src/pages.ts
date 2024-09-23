import {
	applyPublicFlagsToMessages,
	findManyMessagesWithAuthors,
	findMessageById,
	findMessageByIdWithDiscordAccount,
	getParentChannelOfMessage,
	getThreadIdOfMessage,
} from './message';
import {
	NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD,
	NUMBER_OF_THREADS_TO_LOAD,
} from '@answeroverflow/constants';
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
import {
	DiscordAPIServer,
	stripPrivateChannelData,
	stripPrivateFullMessageData,
	stripPrivateServerData,
} from './permissions';

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
					const isPublic =
						areAllServerMessagesPublic ||
						(uss &&
							addFlagsToUserServerSettings(uss).flags
								.canPubliclyDisplayMessages);
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
	selectedChannel: string | undefined;
	page: number;
}) {
	const { idOrVanityUrl, limit = NUMBER_OF_THREADS_TO_LOAD } = opts;
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

	const offset = (opts.page > 0 ? opts.page - 1 : opts.page) * limit;
	// eslint-disable-next-line prefer-const
	let [found, questions] = await Promise.all([
		db.query.dbServers.findFirst({
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
				},
			},
		}),
		opts.selectedChannel
			? db.query.dbChannels.findMany({
					where: eq(dbChannels.parentId, opts.selectedChannel),
					orderBy: desc(dbChannels.id),
					offset,
					limit: limit * 10, // Allow buffer room if some threads are private
				})
			: [],
	]);
	if (!found || found.kickedTime != null) return null;
	const channels = found.channels
		.map((c) => zChannelPublic.parse(c))
		.sort((a, b) => {
			if (
				a.type === ChannelType.GuildForum.valueOf() &&
				b.type !== ChannelType.GuildForum.valueOf()
			)
				return -1;
			if (
				a.type !== ChannelType.GuildForum.valueOf() &&
				b.type === ChannelType.GuildForum.valueOf()
			)
				return 1;
			if (
				a.type === ChannelType.GuildText.valueOf() &&
				b.type !== ChannelType.GuildText.valueOf()
			)
				return -1;
			if (
				a.type !== ChannelType.GuildText.valueOf() &&
				b.type === ChannelType.GuildText.valueOf()
			)
				return 1;
			return 0;
		});
	const firstChannel = channels[0];
	if (!opts.selectedChannel && firstChannel) {
		questions = await db.query.dbChannels.findMany({
			where: eq(dbChannels.parentId, firstChannel.id),
			orderBy: desc(dbChannels.id),
			offset,
			limit: limit * 10, // Allow buffer room if some threads are private
		});
	}
	const msgs = await findManyMessagesWithAuthors(
		questions.map((q) => q.id),
		{
			excludePrivateMessages: true,
		},
	);
	const msgLookup = new Map(msgs.map((m) => [m.id, m]));
	const posts = questions
		.map((q) => {
			const msg = msgLookup.get(q.id);
			if (!msg) return null;
			return {
				message: msg,
				thread: q,
			};
		})
		.filter(Boolean);

	return {
		server: zServerPublic.parse(found),
		channels: channels,
		posts:
			opts.page > 0 ? posts.slice(limit, limit * 2) : posts.slice(0, limit),
	};
}

export type CommunityPageData = NonNullable<
	Awaited<ReturnType<typeof findServerWithCommunityPageData>>
>;

export async function findMessageResultPage(
	messageId: string,
	userServers: DiscordAPIServer[] | null,
) {
	const targetMessage = await findMessageById(messageId);
	if (!targetMessage) {
		return null;
	}
	// Declare as const to make TypeScript not yell at us when used in arrow functions
	const threadId = getThreadIdOfMessage(targetMessage);
	// TODO: These should maybe be a different error code
	const parentId = getParentChannelOfMessage(targetMessage);

	if (!parentId) {
		return null;
	}

	const startTime = Date.now();

	const [result, rootMessage, messages] = await Promise.all([
		db.query.dbChannels.findFirst({
			where: eq(dbChannels.id, threadId ?? parentId),
			with: {
				server: true,
				parent: true,
			},
		}),
		threadId ? findMessageByIdWithDiscordAccount(threadId) : undefined,
		db.query.dbMessages.findMany({
			where: and(
				eq(dbMessages.channelId, threadId ?? parentId),
				!threadId ? gte(dbMessages.id, targetMessage.id) : undefined,
			),
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
							where: eq(dbUserServerSettings.serverId, targetMessage.serverId),
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
		}),
	]);

	const endTime = Date.now();
	console.log(
		`findMessageResultPage /m/${messageId} took ${endTime - startTime}ms`,
	);

	if (!result) {
		return null;
	}
	const { server, ...channel } = result;

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
		server: stripPrivateServerData(addFlagsToServer(server)),
		channel: stripPrivateChannelData(addFlagsToChannel(parentChannel)),
		messages: combinedMessages.map((msg) => {
			return stripPrivateFullMessageData(msg, userServers);
		}),
		rootMessage: rootMessage
			? stripPrivateFullMessageData(rootMessage, userServers)
			: undefined,
		thread: channel?.parent
			? stripPrivateChannelData(addFlagsToChannel(channel))
			: null,
	};
}

export async function makeMessageResultPage(
	messageId: string,
	userServers: DiscordAPIServer[] | null,
) {
	console.log(`Generating message result page for ${messageId}`);
	const startPageGeneration = performance.now();
	const data = await findMessageResultPage(messageId, userServers);
	if (!data) {
		return null;
	}
	const { messages, server, thread, channel } = data;
	const endPageGeneration = performance.now();
	console.log(
		`Page generation for ${messageId} took ${
			endPageGeneration - startPageGeneration
		}ms`,
	);

	return {
		messages,
		parentChannel: channel,
		server,
		thread,
		recommendedPosts: [],
	};
}
