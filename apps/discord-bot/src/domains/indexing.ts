import {
	upsertManyDiscordAccounts,
	type Message as AOMessage,
	upsertManyMessages,
	upsertChannel,
	findManyUserServerSettings,
	findChannelById,
	findLatestArchivedTimestampByChannelId,
	findLatestMessageInChannel,
} from '@answeroverflow/db';
import {
	type AnyThreadChannel,
	ChannelType,
	Client,
	ForumChannel,
	Guild,
	type GuildBasedChannel,
	type GuildTextBasedChannel,
	Message,
	NewsChannel,
	type Snowflake,
	type TextBasedChannel,
	TextChannel,
} from 'discord.js';
import {
	extractUsersSetFromMessages,
	messagesToAOMessagesSet,
	toAOChannel,
} from '~discord-bot/utils/conversions';
import { container } from '@sapphire/framework';
import { sortMessagesById } from '@answeroverflow/discordjs-utils';
import * as Sentry from '@sentry/node';

export async function indexServers(client: Client) {
	const indexingStartTime = Date.now();
	container.logger.info(`Indexing ${client.guilds.cache.size} servers`);
	for await (const guild of client.guilds.cache.values()) {
		try {
			await indexServer(guild);
		} catch (error) {
			Sentry.withScope((scope) => {
				scope.setExtra('guild', guild);
				Sentry.captureException(error);
			});
		}
	}
	const indexingEndTime = Date.now();
	const indexingDuration = indexingEndTime - indexingStartTime;
	// log the time in hours, minutes
	const asHours = Math.floor(indexingDuration / 1000 / 60 / 60);
	const asMinutes = Math.floor(indexingDuration / 1000 / 60) % 60;

	const asSeconds = Math.floor(indexingDuration / 1000) % 60;

	container.logger.info(
		`Indexing complete, took ${asHours} hour${
			asHours === 1 ? '' : 's'
		} ${asMinutes} min${asMinutes === 1 ? '' : 's'} ${asSeconds} sec${
			asSeconds === 1 ? '' : 's'
		}`,
	);
}

async function indexServer(guild: Guild) {
	container.logger.debug(`Indexing server ${guild.id} | ${guild.name}`);
	for await (const channel of guild.channels.cache.values()) {
		const isIndexableChannelType =
			channel.type === ChannelType.GuildText ||
			channel.type === ChannelType.GuildAnnouncement ||
			channel.type === ChannelType.GuildForum;
		if (isIndexableChannelType) {
			await indexRootChannel(channel);
		}
	}
}

export async function indexRootChannel(
	channel: TextChannel | NewsChannel | ForumChannel,
) {
	const settings = await findChannelById(channel.id);

	const botCanViewChannel = channel
		.permissionsFor(channel.client.user)
		?.has(['ViewChannel', 'ReadMessageHistory']);
	if (!settings || !settings.flags.indexingEnabled || !botCanViewChannel) {
		return;
	}

	container.logger.debug(`Indexing channel ${channel.id} | ${channel.name}`);
	if (channel.type === ChannelType.GuildForum) {
		const maxNumberOfThreadsToCollect = process.env
			.MAX_NUMBER_OF_THREADS_TO_COLLECT
			? parseInt(process.env.MAX_NUMBER_OF_THREADS_TO_COLLECT)
			: 1000;
		let threadCutoffTimestamp = await findLatestArchivedTimestampByChannelId(
			channel.id,
		);
		if (process.env.NODE_ENV === 'test') {
			threadCutoffTimestamp = null;
		}
		const archivedThreads: AnyThreadChannel[] = [];
		container.logger.debug(
			`Fetching archived threads for channel ${channel.id} ${channel.name} in server ${channel.guildId} ${channel.guild.name}`,
		);
		const fetchAllArchivedThreads = async (before?: number | string) => {
			const fetched = await channel.threads.fetchArchived({
				type: 'public',
				before,
			});

			const last = fetched.threads.last();
			const isLastThreadOlderThanCutoff =
				last?.archiveTimestamp &&
				threadCutoffTimestamp &&
				last.archiveTimestamp < threadCutoffTimestamp;
			archivedThreads.push(...fetched.threads.values());

			if (
				!fetched.hasMore ||
				!last ||
				fetched.threads.size == 0 ||
				isLastThreadOlderThanCutoff
			)
				return;
			await fetchAllArchivedThreads(last.archiveTimestamp ?? last.id);
		};

		// Fetching all archived threads is very expensive, so only do it on the very first indexing pass
		if (process.env.NODE_ENV === 'test') {
			const data = await channel.threads.fetchArchived({
				type: 'public',
				fetchAll: true,
			});
			archivedThreads.push(...data.threads.values());
		} else {
			await fetchAllArchivedThreads();
		}

		container.logger.debug(
			`Fetched ${archivedThreads.length} archived threads for channel ${channel.id} ${channel.name} in server ${channel.guildId} ${channel.guild.name}`,
		);

		const activeThreads = await channel.threads.fetchActive();
		container.logger.debug(
			`Found ${archivedThreads.length} archived threads and ${
				activeThreads.threads.size
			} active threads, a total of ${
				archivedThreads.length + activeThreads.threads.size
			} threads`,
		);

		// archived threads are sorted by archive timestamp from newest to oldest  so we reverse them
		const threadsToIndex = [
			...archivedThreads.reverse(),
			...activeThreads.threads.values(),
		]
			.filter(
				(x) => x.type === ChannelType.PublicThread && x.parentId === channel.id,
			)
			.slice(0, maxNumberOfThreadsToCollect);
		container.logger.debug(
			`Pruned threads to index from ${
				activeThreads.threads.size + archivedThreads.length
			} to ${threadsToIndex.length} threads`,
		);

		let threadsIndexed = 0;
		for await (const thread of threadsToIndex) {
			container.logger.debug(
				`(${++threadsIndexed}/${threadsToIndex.length}) Indexing:
Thread: ${thread.id} | ${thread.name}
Channel: ${channel.id} | ${channel.name}
Server: ${channel.guildId} | ${channel.guild.name}`,
			);
			await indexTextBasedChannel(thread);
		}
	} else {
		/*
      Handles indexing of text channels and news channels
      Text channels and news channels have messages in them, so we have to fetch the messages
      We also add any threads we find to the threads array
      Threads can be found from normal messages or system create messages
      TODO: Handle threads without any parent messages in the channel, unsure if possible
      */
		await indexTextBasedChannel(channel);
	}
}

export async function indexTextBasedChannel(channel: GuildTextBasedChannel) {
	if (!channel.viewable) {
		return;
	}
	const lastIndexedMessage = await findLatestMessageInChannel(channel.id);
	const start = lastIndexedMessage?.id;
	container.logger.debug(
		`Indexing channel ${channel.id} | ${channel.name} from message id ${
			start ?? 'beginning'
		}`,
	);
	let messages: Message[] = [];
	if (
		channel.type === ChannelType.PublicThread ||
		channel.type === ChannelType.AnnouncementThread
	) {
		messages = await fetchAllMessages(channel, {
			start,
		});
	} else {
		messages = await fetchAllMessages(channel, {
			start,
		});
		const threadsToIndex: AnyThreadChannel[] = [];
		for (const message of messages) {
			const thread = message.thread;
			if (
				thread &&
				(thread.type === ChannelType.PublicThread ||
					thread.type === ChannelType.AnnouncementThread)
			) {
				threadsToIndex.push(thread);
			}
		}

		let threadsIndexed = 0;
		for await (const thread of threadsToIndex) {
			container.logger.debug(
				`(${threadsIndexed++}/${threadsToIndex.length}) Indexing:
Thread: ${thread.id} | ${thread.name}
Channel: ${channel.id} | ${channel.name}
Server: ${channel.guildId} | ${channel.guild.name}`,
			);
			await indexTextBasedChannel(thread);
		}
	}
	await storeIndexData(messages, channel);
	container.logger.debug(
		`Finished writing data, indexing complete for channel ${channel.id} | ${channel.name}`,
	);
}

async function storeIndexData(
	messages: Message[],
	channel: GuildTextBasedChannel,
) {
	if (messages.length === 0) {
		container.logger.debug(
			`No messages to index for channel ${channel.id} | ${channel.name}`,
		);
	}
	// Filter out messages from users with indexing disabled or from the system
	const filteredMessages = await filterMessages(messages, channel);

	// Convert to Answer Overflow data types
	const convertedUsers = extractUsersSetFromMessages(filteredMessages);
	const convertedMessages = await messagesToAOMessagesSet(filteredMessages);

	if (channel.client.id == null) {
		throw new Error('Received a null client id when indexing');
	}

	addSolutionsToMessages(filteredMessages, convertedMessages);
	container.logger.debug(
		`Upserting ${convertedUsers.length} discord accounts `,
	);
	await upsertManyDiscordAccounts(convertedUsers);
	container.logger.debug(`Upserting channel: ${channel.id}`);
	await upsertChannel({
		create: {
			...toAOChannel(channel),
		},
		update: {
			archivedTimestamp: toAOChannel(channel).archivedTimestamp,
		},
	});
	container.logger.debug(`Upserting ${convertedMessages.length} messages`);
	await upsertManyMessages(convertedMessages);
}

type MessageFetchOptions = {
	start?: Snowflake | undefined;
	limit?: number | undefined;
};

export function addSolutionsToMessages(
	messages: Message[],
	convertedMessages: AOMessage[],
) {
	// Loop through filtered messages for everything from the Answer Overflow bot
	// Put the solution messages on the relevant messages
	const messageLookup = new Map(convertedMessages.map((x) => [x.id, x]));
	for (const msg of messages) {
		const { questionId, solutionId } = findSolutionsToMessage(msg);
		if (questionId && solutionId && messageLookup.has(questionId)) {
			messageLookup.get(questionId)!.solutionIds.push(solutionId);
		}
	}
}

export function findSolutionsToMessage(msg: Message) {
	let questionId: string | null = null;
	let solutionId: string | null = null;
	if (msg.author.id != msg.client.user.id) {
		return { questionId, solutionId };
	}
	for (const embed of msg.embeds) {
		for (const field of embed.fields) {
			if (field.name === 'Question Message ID') {
				questionId = field.value;
			}
			if (field.name === 'Solution Message ID') {
				solutionId = field.value;
			}
		}
	}
	return { questionId, solutionId };
}

export async function filterMessages(
	messages: Message[],
	channel: GuildBasedChannel,
) {
	const seenUserIds = [
		...new Set(messages.map((message) => message.author.id)),
	];
	const userServerSettings = await findManyUserServerSettings(
		seenUserIds.map((x) => ({
			serverId: channel.guildId,
			userId: x,
		})),
	);

	if (!userServerSettings) {
		throw new Error('Error fetching user server settings');
	}

	const usersToRemove = new Set(
		userServerSettings
			.filter((x) => x.flags.messageIndexingDisabled)
			.map((x) => x.userId),
	);

	return messages.filter((x) => {
		const isIgnoredUser = usersToRemove.has(x.author.id);
		const isSystemMessage = x.system;
		return !isIgnoredUser && !isSystemMessage;
	});
}
export async function fetchAllMessages(
	channel: TextBasedChannel,
	opts: MessageFetchOptions = {},
) {
	const {
		start,
		limit = process.env.MAX_NUMBER_OF_MESSAGES_TO_COLLECT
			? parseInt(process.env.MAX_NUMBER_OF_MESSAGES_TO_COLLECT)
			: 20000,
	} = opts;
	const messages: Message[] = [];
	if (channel.lastMessageId && start == channel.lastMessageId) {
		return [];
	}
	let message: Message | undefined = undefined;
	let approximateThreadMessageCount = 0;
	const asyncMessageFetch = async (after: string) => {
		await channel.messages.fetch({ limit: 100, after }).then((messagePage) => {
			const sortedMessagesById = sortMessagesById([...messagePage.values()]);
			messages.push(...sortedMessagesById.values());
			// Update our message pointer to be last message in page of messages
			message =
				0 < sortedMessagesById.length ? sortedMessagesById.at(-1) : undefined;
			messages.forEach((msg) => {
				if (msg.thread) {
					approximateThreadMessageCount += msg.thread.messageCount ?? 0;
				}
			});
		});
		if (
			message &&
			(limit === undefined ||
				messages.length + approximateThreadMessageCount < limit)
		) {
			await asyncMessageFetch(message.id);
		}
	};

	await asyncMessageFetch(start ?? '0');
	return messages.slice(0, limit);
}
