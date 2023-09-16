import type { z } from 'zod';
import {
	applyPublicFlagsToMessages,
	findAllChannelQuestions,
	findMessageById,
	findMessageByIdWithDiscordAccount,
	getParentChannelOfMessage,
	getThreadIdOfMessage,
	type MessageFull,
} from './message';
import { NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD } from '@answeroverflow/constants';
import { db } from './db';
import { and, eq, or, sql } from 'drizzle-orm';
import {
	dbChannels,
	dbMessages,
	dbServers,
	dbUserServerSettings,
} from './schema';
import { zServerPublic } from './zodSchemas/serverSchemas';
import { addFlagsToServer } from './utils/serverUtils';
import { addFlagsToChannel, zChannelPublic } from './zodSchemas/channelSchemas';

export async function findServerWithCommunityPageData(opts: {
	idOrVanityUrl: string;
	limit?: number;
}) {
	const { idOrVanityUrl, limit } = opts;
	// TODO: Micro optimization, if the idOrVanityUrl is a number, we can skip the vanityUrl check
	const found = await db.query.dbServers.findFirst({
		where: or(
			eq(dbServers.id, idOrVanityUrl),
			eq(dbServers.vanityUrl, idOrVanityUrl),
		),
		with: {
			channels: true,
		},
	});
	if (!found) return null;
	const channels = found.channels
		.map(addFlagsToChannel)
		.filter((c) => c.flags.indexingEnabled)
		.map((c) => zChannelPublic.parse(c));
	const server = addFlagsToServer(found);
	const serverPublic = zServerPublic.parse(server);

	const allChannelQuestions = await Promise.all(
		channels.map((c) =>
			findAllChannelQuestions({
				channelId: c.id,
				includePrivateMessages: false,
				limit: 10000,
				server,
			}),
		),
	);

	const questionLookup = new Map<
		string,
		{
			message: MessageFull;
			thread: z.infer<typeof zChannelPublic>;
		}[]
	>();

	for (const channelQuestions of allChannelQuestions.flat()) {
		if (!channelQuestions.thread.parentId) continue;
		if (!channelQuestions.message) continue;
		const channel = channelQuestions.thread.parentId;
		const questions = questionLookup.get(channel);
		if (!questions) {
			questionLookup.set(channel, [
				{
					message: channelQuestions.message,
					thread: channelQuestions.thread,
				},
			]);
		} else {
			questions.push({
				message: channelQuestions.message,
				thread: channelQuestions.thread,
			});
		}
	}

	const channelsWithQuestions = channels
		.map((c) => {
			const questions = questionLookup.get(c.id) ?? [];
			return {
				channel: c,
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

	const [result, rootMessage] = await Promise.all([
		db.query.dbChannels.findFirst({
			where: eq(dbChannels.id, threadId ?? parentId),
			with: {
				server: true,
				parent: true,
				messages: {
					where: !threadId
						? sql`CAST(${dbMessages.id} AS SIGNED) >= CAST(${targetMessage.id} AS SIGNED)`
						: undefined,
					orderBy: sql`CAST(${dbMessages.id} AS SIGNED) ASC`,
					limit: parentId ? NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD : undefined,
					with: {
						author: {
							with: {
								userServerSettings: {
									where: and(
										eq(dbUserServerSettings.serverId, targetMessage.serverId),
										eq(dbUserServerSettings.userId, targetMessage.authorId),
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
											where: and(
												eq(
													dbUserServerSettings.serverId,
													targetMessage.serverId,
												),
												eq(dbUserServerSettings.userId, targetMessage.authorId),
											),
										},
									},
								},
								attachments: true,
							},
						},
						reactions: true,
						solutions: {
							with: {
								author: {
									with: {
										userServerSettings: {
											where: and(
												eq(
													dbUserServerSettings.serverId,
													targetMessage.serverId,
												),
												eq(dbUserServerSettings.userId, targetMessage.authorId),
											),
										},
									},
								},
								attachments: true,
							},
						},
					},
				},
			},
		}),
		threadId ? findMessageByIdWithDiscordAccount(threadId) : undefined,
	]);
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
