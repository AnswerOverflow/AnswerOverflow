import {
	upsertManyDiscordAccounts,
	Message as AOMessage,
	upsertManyChannels,
	upsertManyMessages,
	upsertChannel,
	findManyUserServerSettings,
	findChannelById,
} from '@answeroverflow/db';
import {
	AnyThreadChannel,
	ChannelType,
	Client,
	DiscordAPIError,
	ForumChannel,
	Guild,
	GuildBasedChannel,
	Message,
	NewsChannel,
	PublicThreadChannel,
	Snowflake,
	TextBasedChannel,
	TextChannel,
} from 'discord.js';
import {
	extractUsersSetFromMessages,
	messagesToAOMessagesSet,
	toAOChannel,
	toAOThread,
} from '~discord-bot/utils/conversions';
import { container } from '@sapphire/framework';
import {
	isSnowflakeLarger,
	sortMessagesById,
} from '@answeroverflow/discordjs-utils';
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
	container.logger.info(`Indexing complete, took ${indexingDuration}ms`);
}

async function indexServer(guild: Guild) {
	container.logger.info(`Indexing server ${guild.id} | ${guild.name}`);
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

	container.logger.info(`Indexing channel ${channel.id} | ${channel.name}`);

	let start =
		settings.lastIndexedSnowflake == null
			? undefined
			: settings.lastIndexedSnowflake;
	if (process.env.NODE_ENV === 'development') {
		start = undefined; // always index from the beginning in development for ease of testing
	}
	// Collect all messages
	const { messages: messagesToParse, threads } =
		await fetchAllChannelMessagesWithThreads(channel, {
			start,
			limit: process.env.MAXIMUM_CHANNEL_MESSAGES_PER_INDEX
				? parseInt(process.env.MAXIMUM_CHANNEL_MESSAGES_PER_INDEX)
				: undefined,
		});

	// Filter out messages from users with indexing disabled or from the system
	const filteredMessages = await filterMessages(messagesToParse, channel);

	// Convert to Answer Overflow data types

	const convertedUsers = extractUsersSetFromMessages(filteredMessages);
	const convertedThreads = threads.map((x) => toAOThread(x));
	const convertedMessages = messagesToAOMessagesSet(filteredMessages);

	if (channel.client.id == null) {
		throw new Error('Received a null client id when indexing');
	}

	addSolutionsToMessages(filteredMessages, convertedMessages);

	const largestSnowflake = sortMessagesById(filteredMessages).pop()?.id;
	container.logger.info('Indexing complete, writing data');
	container.logger.info(`Upserting ${convertedUsers.length} discord accounts `);
	await upsertManyDiscordAccounts(convertedUsers);
	container.logger.info(`Upserting channel: ${channel.id}`);
	await upsertChannel({
		create: {
			...toAOChannel(channel),
			lastIndexedSnowflake: largestSnowflake,
		},
		update: {
			lastIndexedSnowflake: largestSnowflake,
		},
	});
	container.logger.info(`Upserting ${convertedMessages.length} messages`);
	await upsertManyMessages(convertedMessages);
	container.logger.info(`Upserting ${convertedThreads.length} threads`);
	await upsertManyChannels(
		convertedThreads.map((x) => ({
			create: x,
			update: {
				name: x.name,
			},
		})),
	);
	container.logger.info(
		`Finished writing data, indexing complete for channel ${channel.id}`,
	);
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

export async function fetchAllChannelMessagesWithThreads(
	channel: ForumChannel | NewsChannel | TextChannel,
	options: MessageFetchOptions = {},
) {
	container.logger.info(
		`Fetching all messages for channel ${channel.id} ${
			channel.name
		} in server ${channel.guildId} ${
			channel.guild.name
		} with options ${JSON.stringify(options)}`,
	);
	let threads: PublicThreadChannel[] = [];
	const collectedMessages: Message[] = [];

	/*
      Handles indexing of forum channels
      Forum channels have no messages in them, so we have to fetch the threads
  */

	if (channel.type === ChannelType.GuildForum) {
		const archivedThreads: AnyThreadChannel[] = [];
		container.logger.info(
			`Fetching archived threads for channel ${channel.id} ${channel.name} in server ${channel.guildId} ${channel.guild.name}`,
		);
		const fetchAllArchivedThreads = async (before?: number | string) => {
			const fetched = await channel.threads.fetchArchived({
				type: 'public',
				fetchAll: true,
				before,
			});

			const last = fetched.threads.last();
			if (!fetched.hasMore || !last || fetched.threads.size == 0) return;
			archivedThreads.push(...fetched.threads.values());
			await fetchAllArchivedThreads(last.archiveTimestamp ?? last.id);
		};

		// Fetching all archived threads is very expensive, so only do it on the very first indexing pass
		if (options.start || process.env.NODE_ENV === 'test') {
			const data = await channel.threads.fetchArchived(
				{
					type: 'public',
					fetchAll: true,
				},
				false,
			);
			archivedThreads.push(...data.threads.values());
		} else {
			await fetchAllArchivedThreads();
		}

		container.logger.info(
			`Fetched ${archivedThreads.length} archived threads for channel ${channel.id} ${channel.name} in server ${channel.guildId} ${channel.guild.name}`,
		);

		const activeThreads = await channel.threads.fetchActive();
		container.logger.info(
			`Found ${archivedThreads.length} archived threads and ${
				activeThreads.threads.size
			} active threads, a total of ${
				archivedThreads.length + activeThreads.threads.size
			} threads`,
		);
		threads = [...archivedThreads, ...activeThreads.threads.values()]
			.filter((x) => x.type === ChannelType.PublicThread)
			.filter((x) =>
				x.lastMessageId
					? isSnowflakeLarger(x.lastMessageId, options.start ?? '0')
					: true,
			)
			.map((x) => x as PublicThreadChannel);
		container.logger.info(
			`Pruned threads to index from ${
				activeThreads.threads.size + archivedThreads.length
			} to ${threads.length} threads`,
		);
		const threadsWithoutLastMessageId = threads.filter((x) => !x.lastMessageId);
		if (threadsWithoutLastMessageId.length > 0) {
			container.logger.warn(
				`Found ${threadsWithoutLastMessageId.length} threads without a last message id`,
			);
		}
	} else {
		/*
      Handles indexing of text channels and news channels
      Text channels and news channels have messages in them, so we have to fetch the messages
      We also add any threads we find to the threads array
      Threads can be found from normal messages or system create messages
      TODO: Handle threads without any parent messages in the channel, unsure if possible
      */
		const messages = await fetchAllMessages(channel, options);
		for (const message of messages) {
			collectedMessages.push(message);
			if (
				message.thread &&
				(message.thread.type === ChannelType.PublicThread ||
					message.thread.type === ChannelType.AnnouncementThread)
			) {
				threads.push(message.thread);
			}
		}
	}
	container.logger.info(`Found ${threads.length} threads to index`);
	let indexedThreads = 0;
	for await (const thread of threads) {
		try {
			indexedThreads++;
			container.logger.info(
				`Fetching messages for thread ${thread.id} ${thread.name} in channel ${
					thread.parentId ?? 'no parent id'
				} ${thread.parent ? thread.parent.name : 'no parent'} in server ${
					thread.guildId
				} ${thread.guild.name} (${indexedThreads}/${threads.length})`,
			);
			const threadMessages = await fetchAllMessages(thread);
			collectedMessages.push(...threadMessages);
		} catch (error) {
			if (error instanceof DiscordAPIError && error.status == 404) continue;
			throw error;
		}
	}

	return { messages: collectedMessages, threads };
}

export async function fetchAllMessages(
	channel: TextBasedChannel,
	opts: MessageFetchOptions = {},
) {
	const {
		start,
		limit = channel.type === ChannelType.GuildText ? 1000 : 20000,
	} = opts;
	const messages: Message[] = [];
	// Create message pointer
	const initialFetch = await channel.messages.fetch({
		limit: 1,
		after: start ?? '0',
	}); // TODO: Check if 0 works correctly for starting at the beginning
	let message = initialFetch.size === 1 ? initialFetch.first() : null;
	messages.push(...initialFetch.values());

	const asyncMessageFetch = async (after: string) => {
		await channel.messages.fetch({ limit: 100, after }).then((messagePage) => {
			const sortedMessagesById = sortMessagesById([...messagePage.values()]);
			messages.push(...sortedMessagesById.values());
			// Update our message pointer to be last message in page of messages
			message =
				0 < sortedMessagesById.length ? sortedMessagesById.at(-1) : null;
		});
		if (message && (limit === undefined || messages.length < limit)) {
			await asyncMessageFetch(message.id);
		}
	};

	await asyncMessageFetch(message?.id ?? '0');
	return messages.slice(0, limit);
}
