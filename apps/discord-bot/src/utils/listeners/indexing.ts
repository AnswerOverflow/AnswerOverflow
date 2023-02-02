import type { Message as AOMessage } from "@answeroverflow/db";
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
import { createAnswerOveflowBotCtx } from "~discord-bot/utils/context";
import {
  extractUsersSetFromMessages,
  messagesToAOMessagesSet,
  toAOChannelWithServer,
  toAOThread,
} from "~discord-bot/utils/conversions";
import { container } from "@sapphire/framework";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";
import { sortMessagesById } from "../utils";

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

  const settings = await callApiWithConsoleStatusHandler({
    ApiCall: (router) => router.channel_settings.byId(channel.id),
    getCtx: createAnswerOveflowBotCtx,
    error_message: `Failed to get channel settings for channel ${channel.id}`,
    success_message: `Got channel settings for channel ${channel.id}`,
    allowed_errors: "NOT_FOUND",
  });

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

  await callApiWithConsoleStatusHandler({
    async ApiCall(router) {
      container.logger.debug(`Upserting ${converted_users.length} users`);
      await router.discord_accounts.upsertBulk(converted_users);

      container.logger.debug(`Upserting channel ${channel.id}`);
      await router.channels.upsertWithDeps(toAOChannelWithServer(channel));

      container.logger.debug(`Upserting ${converted_messages.length} messages`);
      await router.messages.upsertBulk(converted_messages);

      container.logger.debug(`Upserting ${converted_threads.length} threads`);
      await router.channels.upsertMany(converted_threads);

      await router.channel_settings.upsert({
        channel_id: channel.id,
        last_indexed_snowflake: converted_messages[converted_messages.length - 1]!.id,
      });
    },
    error_message: `Failed to index channel ${channel.id}`,
    getCtx: createAnswerOveflowBotCtx,
  });
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
  const user_server_settings = await callApiWithConsoleStatusHandler({
    ApiCall(router) {
      return router.user_server_settings.byIdMany(
        seen_user_ids.map((x) => {
          return {
            server_id: channel.guildId,
            user_id: x,
          };
        })
      );
    },
    error_message: "Failed to fetch user server settings in indexing",
    allowed_errors: "NOT_FOUND",
    getCtx: createAnswerOveflowBotCtx,
    success_message: `Fetched ${seen_user_ids.length} user server settings`,
  });

  if (!user_server_settings) {
    throw new Error("Failed to fetch user server settings");
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
