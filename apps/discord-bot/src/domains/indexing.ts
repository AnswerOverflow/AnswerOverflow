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
	ChannelType,
	Client,
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

export async function indexServers(client: Client) {
	container.logger.info(`Indexing ${client.guilds.cache.size} servers`);
	for (const guild of client.guilds.cache.values()) {
		try {
			await indexServer(guild);
		} catch (error) {
			container.logger.error(`Error indexing server ${guild.id}`, error);
		}
	}
}

async function indexServer(guild: Guild) {
	container.logger.info(`Indexing server ${guild.id}`);
	for (const channel of guild.channels.cache.values()) {
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
	container.logger.info(
		`Attempting to indexing channel ${channel.id} | ${channel.name}`,
	);

	const settings = await findChannelById(channel.id);

	const botCanViewChannel = channel
		.permissionsFor(channel.client.user)
		?.has(['ViewChannel', 'ReadMessageHistory']);
	if (!settings || !settings.flags.indexingEnabled || !botCanViewChannel) {
		return;
	}
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
	container.logger.info(`Fetching all messages for channel ${channel.id} ${
		channel.name
	} with options ${JSON.stringify(options)}
  `);
	let threads: PublicThreadChannel[] = [];
	const collectedMessages: Message[] = [];

	/*
      Handles indexing of forum channels
      Forum channels have no messages in them, so we have to fetch the threads
  */
	if (channel.type === ChannelType.GuildForum) {
		const archivedThreads = await channel.threads.fetchArchived({
			type: 'public',
			fetchAll: true,
		});
		const activeThreads = await channel.threads.fetchActive();
		container.logger.info(
			`Found ${archivedThreads.threads.size} archived threads and ${
				activeThreads.threads.size
			} active threads, a total of ${
				archivedThreads.threads.size + activeThreads.threads.size
			} threads`,
		);
		threads = [
			...archivedThreads.threads.values(),
			...activeThreads.threads.values(),
		]
			.filter((x) => x.type === ChannelType.PublicThread)
			.filter((x) =>
				x.lastMessageId
					? isSnowflakeLarger(x.lastMessageId, options.start ?? '0')
					: true,
			)
			.map((x) => x as PublicThreadChannel);
		container.logger.info(
			`Pruned threads to index from ${
				activeThreads.threads.size + archivedThreads.threads.size
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
			if (
				message.thread &&
				(message.thread.type === ChannelType.PublicThread ||
					message.thread.type === ChannelType.AnnouncementThread)
			) {
				threads.push(message.thread);
			}
		}
		collectedMessages.push(...messages);
	}

	for (const thread of threads) {
		const threadMessages = await fetchAllMessages(thread);
		collectedMessages.push(...threadMessages);
	}

	return { messages: collectedMessages, threads };
}

export async function fetchAllMessages(
	channel: TextBasedChannel,
	opts: MessageFetchOptions = {},
) {
	const { start, limit = 20000 } = opts;
	const messages: Message[] = [];
	// Create message pointer
	const initialFetch = await channel.messages.fetch({
		limit: 1,
		after: start ?? '0',
	}); // TODO: Check if 0 works correctly for starting at the beginning
	let message = initialFetch.size === 1 ? initialFetch.first() : null;
	messages.push(...initialFetch.values());
	while (message && (limit === undefined || messages.length < limit)) {
		// container.logger.debug(`Fetching from ${message.id}`);
		await channel.messages
			.fetch({ limit: 100, after: message.id })
			.then((messagePage) => {
				// container.logger.debug(`Received ${messagePage.size} messages`);
				const sortedMessagesById = sortMessagesById([...messagePage.values()]);
				messages.push(...sortedMessagesById.values());
				// Update our message pointer to be last message in page of messages
				message =
					0 < sortedMessagesById.length ? sortedMessagesById.at(-1) : null;
			});
	}
	return messages.slice(0, limit);
}
