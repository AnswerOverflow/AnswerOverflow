import {
	addFlagsToChannel,
	zChannelPublic,
	zServerPrismaCreate,
	zServerPublic,
} from '@answeroverflow/prisma-types';
import { addFlagsToServer } from '@answeroverflow/prisma-types';
import type { z } from 'zod';
import {
	addAuthorsToMessages,
	addReferencesToMessages,
	findAllChannelQuestions,
	findMessageById,
	findMessagesByChannelId,
	type MessageFull,
} from './message';
import {
	getParentChannelOfMessage,
	getThreadIdOfMessage,
} from '@answeroverflow/elastic-types';
import { findChannelById } from './channel';
import { findServerById } from './server';
import { NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD } from '@answeroverflow/constants';
import { ChannelType } from 'discord-api-types/v10';
import { db } from '../index';
import { eq, or } from 'drizzle-orm';
import { servers } from './schema';

export async function findServerWithCommunityPageData(opts: {
	idOrVanityUrl: string;
	limit?: number;
}) {
	const { idOrVanityUrl, limit } = opts;
	// TODO: Micro optimization, if the idOrVanityUrl is a number, we can skip the vanityUrl check
	const found = await db.query.servers.findFirst({
		where: or(
			eq(servers.id, idOrVanityUrl),
			eq(servers.vanityUrl, idOrVanityUrl),
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
	const server = addFlagsToServer(zServerPrismaCreate.parse(found));
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

	const threadFetch = threadId ? findChannelById(threadId) : undefined;

	const serverFetch = findServerById(targetMessage.serverId);
	const parentChannelFetch = threadId
		? findChannelById(parentId)
		: findChannelById(targetMessage.channelId);

	const messageFetch = threadId
		? findMessagesByChannelId({
				channelId: threadId,
		  })
		: findMessagesByChannelId({
				channelId: parentId,
				after: targetMessage.id,
				limit: NUMBER_OF_CHANNEL_MESSAGES_TO_LOAD,
		  });

	const [thread, server, channel, messages, rootMessage] = await Promise.all([
		threadFetch,
		serverFetch,
		parentChannelFetch,
		messageFetch,
		threadId ? findMessageById(threadId) : undefined,
	]);
	if (!server || server.kickedTime) return null;

	if (!channel || !channel.flags.indexingEnabled) {
		return null;
	}
	const messagesWithRefs = await addReferencesToMessages(
		threadId && rootMessage && channel.type !== ChannelType.GuildForum
			? [rootMessage, ...messages]
			: messages,
	);
	const messagesWithDiscordAccounts = await addAuthorsToMessages(
		messagesWithRefs,
		[server],
	);

	return {
		server,
		channel,
		messages: messagesWithDiscordAccounts,
		rootMessage,
		thread,
	};
}
