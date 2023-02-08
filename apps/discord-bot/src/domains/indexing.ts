import {
  upsertManyDiscordAccounts,
  Message as AOMessage,
  upsertManyChannels,
  upsertManyMessages,
  upsertChannel,
  findManyUserServerSettings,
  findChannelById,
} from "@answeroverflow/db";
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
} from "discord.js";
import {
  extractUsersSetFromMessages,
  messagesToAOMessagesSet,
  toAOChannel,
  toAOThread,
} from "~discord-bot/utils/conversions";
import { container } from "@sapphire/framework";
import { sortMessagesById } from "@answeroverflow/discordjs-utils";

export async function indexServers(client: Client) {
  container.logger.info(`Indexing ${client.guilds.cache.size} servers`);
  for (const guild of client.guilds.cache.values()) {
    await indexServer(guild);
  }
}

async function indexServer(guild: Guild) {
  container.logger.info(`Indexing server ${guild.id}`);
  for (const channel of guild.channels.cache.values()) {
    const is_indexable_channel_type =
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement ||
      channel.type === ChannelType.GuildForum;
    if (is_indexable_channel_type) {
      await indexRootChannel(channel);
    }
  }
}

export async function indexRootChannel(channel: TextChannel | NewsChannel | ForumChannel) {
  container.logger.info(`Attempting to indexing channel ${channel.id} | ${channel.name}`);

  const settings = await findChannelById(channel.id);

  if (!settings || !settings.flags.indexing_enabled) {
    return;
  }
  let start = settings.last_indexed_snowflake == null ? undefined : settings.last_indexed_snowflake;
  if (process.env.NODE_ENV === "development") {
    start = undefined; // always index from the beginning in development for ease of testing
  }
  // Collect all messages
  const { messages: messages_to_parse, threads } = await fetchAllChannelMessagesWithThreads(
    channel,
    {
      start,
      limit: process.env.MAXIMUM_CHANNEL_MESSAGES_PER_INDEX
        ? parseInt(process.env.MAXIMUM_CHANNEL_MESSAGES_PER_INDEX)
        : undefined,
    }
  );

  // Filter out messages from users with indexing disabled or from the system
  const filtered_messages = await filterMessages(messages_to_parse, channel);

  // Convert to Answer Overflow data types

  const converted_users = extractUsersSetFromMessages(filtered_messages);
  const converted_threads = threads.map((x) => toAOThread(x));
  const converted_messages = messagesToAOMessagesSet(filtered_messages);

  if (channel.client.id == null) {
    throw new Error("Received a null client id when indexing");
  }

  addSolutionsToMessages(filtered_messages, converted_messages);

  await upsertManyDiscordAccounts(converted_users);
  await upsertChannel(toAOChannel(channel));
  await upsertManyMessages(converted_messages);
  await upsertManyChannels(converted_threads);
}

type MessageFetchOptions = {
  start?: Snowflake | undefined;
  limit?: number | undefined;
};

export function addSolutionsToMessages(messages: Message[], converted_messages: AOMessage[]) {
  // Loop through filtered messages for everything from the Answer Overflow bot
  // Put the solution messages on the relevant messages
  const message_lookup = new Map(converted_messages.map((x) => [x.id, x]));
  for (const msg of messages) {
    const { question_id, solution_id } = findSolutionsToMessage(msg);
    if (question_id && solution_id && message_lookup.has(question_id)) {
      message_lookup.get(question_id)!.solutions.push(solution_id);
    }
  }
}

export function findSolutionsToMessage(msg: Message) {
  let question_id: string | null = null;
  let solution_id: string | null = null;
  if (msg.author.id != msg.client.user.id) {
    return { question_id, solution_id };
  }
  for (const embed of msg.embeds) {
    for (const field of embed.fields) {
      if (field.name === "Question Message ID") {
        question_id = field.value;
      }
      if (field.name === "Solution Message ID") {
        solution_id = field.value;
      }
    }
  }
  return { question_id, solution_id };
}

export async function filterMessages(messages: Message[], channel: GuildBasedChannel) {
  const seen_user_ids = [...new Set(messages.map((message) => message.author.id))];
  const user_server_settings = await findManyUserServerSettings(
    seen_user_ids.map((x) => ({
      server_id: channel.guildId,
      user_id: x,
    }))
  );

  if (!user_server_settings) {
    throw new Error("Error fetching user server settings");
  }

  const users_to_remove = new Set(
    user_server_settings.filter((x) => x.flags.message_indexing_disabled).map((x) => x.user_id)
  );

  return messages.filter((x) => {
    const is_ignored_user = users_to_remove.has(x.author.id);
    const is_system_message = x.system;
    return !is_ignored_user && !is_system_message;
  });
}

export async function fetchAllChannelMessagesWithThreads(
  channel: ForumChannel | NewsChannel | TextChannel,
  options: MessageFetchOptions = {}
) {
  container.logger.info(`
    Fetching all messages for channel ${channel.id} ${channel.name} with options ${JSON.stringify(
    options
  )}
  `);
  let threads: PublicThreadChannel[] = [];
  const collected_messages: Message[] = [];

  /*
      Handles indexing of forum channels
      Forum channels have no messages in them, so we have to fetch the threads
  */
  if (channel.type === ChannelType.GuildForum) {
    const archived_threads = await channel.threads.fetchArchived({
      type: "public",
      fetchAll: true,
    });
    const active_threads = await channel.threads.fetchActive();
    threads = [...archived_threads.threads.values(), ...active_threads.threads.values()]
      .filter((x) => x.type === ChannelType.PublicThread)
      .map((x) => x as PublicThreadChannel);
  } else {
    /*
      Handles indexing of text channels and news channels
      Text channels and news channels have messages in them, so we have to fetch the messages
      We also add any threads we find to the threads array
      Threads can be found from normal messages or system create messages
      TODO: Handle threads without any parent messages in the channel
      */
    const messages = await fetchAllMesages(channel, options);
    for (const message of messages) {
      if (
        message.thread &&
        (message.thread.type === ChannelType.PublicThread ||
          message.thread.type === ChannelType.AnnouncementThread)
      ) {
        threads.push(message.thread);
      }
    }
    collected_messages.push(...messages);
  }

  for (const thread of threads) {
    const thread_messages = await fetchAllMesages(thread);
    collected_messages.push(...thread_messages);
  }

  return { messages: collected_messages, threads };
}

export async function fetchAllMesages(
  channel: TextBasedChannel,
  { start, limit }: MessageFetchOptions = {}
) {
  const messages: Message[] = [];
  // Create message pointer
  const initial_fetch = await channel.messages.fetch({ limit: 1, after: start ?? "0" }); // TODO: Check if 0 works correctly for starting at the beginning
  let message = initial_fetch.size === 1 ? initial_fetch.first() : null;
  messages.push(...initial_fetch.values());
  while (message && (limit === undefined || messages.length < limit)) {
    // container.logger.debug(`Fetching from ${message.id}`);
    await channel.messages.fetch({ limit: 100, after: message.id }).then((messagePage) => {
      // container.logger.debug(`Received ${messagePage.size} messages`);
      const sorted_messages_by_id = sortMessagesById([...messagePage.values()]);
      messages.push(...sorted_messages_by_id.values());
      // Update our message pointer to be last message in page of messages
      message = 0 < sorted_messages_by_id.length ? sorted_messages_by_id.at(-1) : null;
    });
  }
  if (limit) {
    return messages.slice(0, limit);
  }
  return messages;
}
