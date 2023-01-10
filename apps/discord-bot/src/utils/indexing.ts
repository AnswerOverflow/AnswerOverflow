import type { DiscordAccount, Thread, Message as AOMessage } from "@answeroverflow/db";
import {
  ChannelType,
  Client,
  ForumChannel,
  Guild,
  GuildBasedChannel,
  Message,
  NewsChannel,
  Snowflake,
  TextBasedChannel,
  TextChannel,
} from "discord.js";
import { createAnswerOveflowBotCtx } from "~discord-bot/utils/context";
import {
  toAOChannelWithServer,
  toAODiscordAccount,
  toAOMessage,
  toAOThread,
} from "~discord-bot/utils/conversions";
import { container } from "@sapphire/framework";
import { callAPI, callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";

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

async function indexRootChannel(channel: TextChannel | NewsChannel | ForumChannel) {
  container.logger.info(`Attempting to indexing channel ${channel.id} | ${channel.name}`);

  const settings = await callApiWithConsoleStatusHandler({
    ApiCall: (router) => router.channel_settings.byId(channel.id),
    getCtx: createAnswerOveflowBotCtx,
    error_message: `Failed to get channel settings for channel ${channel.id}`,
    success_message: `Got channel settings for channel ${channel.id}`,
  });

  if (!settings) {
    container.logger.info(`Channel ${channel.id} ${channel.name} has no settings, skipping`);
    return;
  }

  if (!settings.flags.indexing_enabled) {
    container.logger.info(`Channel ${channel.id} ${channel.name} has indexing disabled, skipping`);
    return;
  }

  // Collect all messages
  const messages_to_parse = await fetchAllChannelMessagesWithThreads(channel);

  // Filter out messages from users with indexing disabled or from the system
  const filtered_messages = await filterMessages(messages_to_parse, channel);

  // Convert to Answer Overflow data types
  const { converted_users, converted_threads, converted_messages } =
    convertToAODataTypes(filtered_messages);

  if (channel.client.id == null) {
    throw new Error("Received a null client id when indexing");
  }

  addSolutionsToMessages(filtered_messages, converted_messages, channel.client.id);

  await callAPI({
    async ApiCall(router) {
      container.logger.debug(`Upserting ${converted_users.length} users`);
      await router.discord_accounts.upsertBulk(converted_users);
      container.logger.debug(`Upserting channel ${channel.id}`);
      await router.channels.upsertWithDeps(toAOChannelWithServer(channel));
      container.logger.debug(`Upserting ${converted_threads.length} threads`);
      await router.channels.upsertMany(converted_threads);
      container.logger.debug(`Upserting ${converted_messages.length} messages`);
      await router.messages.upsertBulk(converted_messages);
      await router.channel_settings.upsert({
        channel_id: channel.id,
        last_indexed_snowflake: converted_messages[converted_messages.length - 1].id,
      });
    },
    getCtx: createAnswerOveflowBotCtx,
  });
}

type MessageFetchOptions = {
  start?: Snowflake | undefined;
  limit?: number | undefined;
};

function addSolutionsToMessages(
  messages: Message[],
  converted_messages: AOMessage[],
  bot_id: Snowflake
) {
  // Loop through filtered messages for everything from the Answer Overflow bot
  // Put the solution messages on the relevant messages
  const message_lookup = new Map(converted_messages.map((x) => [x.id, x]));
  for (const msg of messages) {
    if (msg.author.id != bot_id) {
      continue;
    }
    for (const embed of msg.embeds) {
      let question_id: string | null = null;
      let solution_id: string | null = null;
      for (const field of embed.fields) {
        if (field.name === "Question Message ID") {
          question_id = field.value;
        }
        if (field.name === "Solution Message ID") {
          solution_id = field.value;
        }
      }
      if (question_id && solution_id && message_lookup.has(question_id)) {
        message_lookup.get(question_id)!.solutions.push(solution_id);
      }
    }
  }
}

function convertToAODataTypes(messages: Message[]) {
  // Sets are used to avoid any duplicates
  // the only one of these that is expected to have a duplicate is converted users but the extra safety doesnt hurt
  const converted_users = new Map<string, DiscordAccount>();
  const converted_threads = new Map<string, Thread>();
  const converted_messages = new Map<string, AOMessage>();
  for (const msg of messages) {
    converted_users.set(msg.author.id, toAODiscordAccount(msg.author));
    if (msg.thread) {
      converted_threads.set(msg.thread.id, toAOThread(msg.thread));
    }
    converted_messages.set(msg.id, toAOMessage(msg));
  }
  return {
    converted_users: [...converted_users.values()],
    converted_threads: [...converted_threads.values()],
    converted_messages: [...converted_messages.values()],
  };
}

async function filterMessages(messages: Message[], channel: GuildBasedChannel) {
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
    getCtx: createAnswerOveflowBotCtx,
    success_message: `Fetched ${seen_user_ids.length} user server settings`,
  });

  if (!user_server_settings) {
    throw new Error("Failed to fetch user server settings");
  }
  const users_to_remove = new Set(
    user_server_settings.filter((x) => x.flags.message_indexing_disabled).map((x) => x.user_id)
  );

  return messages.filter((x) => !users_to_remove.has(x.author.id) || x.system);
}

async function fetchAllChannelMessagesWithThreads(
  channel: ForumChannel | NewsChannel | TextChannel,
  options: MessageFetchOptions = {}
) {
  container.logger.info(`
    Fetching all messages for channel ${channel.id} ${channel.name} with options ${JSON.stringify(
    options
  )}
  `);
  const collected_messages: Message[] = [];
  if (channel.type === ChannelType.GuildForum) {
    const archived_threads = await channel.threads.fetchArchived({
      type: "public",
      fetchAll: true,
    });
    const active_threads = await channel.threads.fetchActive();
    const threads = [...archived_threads.threads.values(), ...active_threads.threads.values()];
    for (const thread of threads) {
      const thread_messages = await fetchAllMesages(thread);
      collected_messages.push(...thread_messages);
    }
  } else if (
    channel.type === ChannelType.GuildAnnouncement ||
    channel.type === ChannelType.GuildText
  ) {
    const messages = await fetchAllChannelMessages(channel, options);
    collected_messages.push(...messages);
  }
  return collected_messages;
}

async function fetchAllChannelMessages(
  channel: NewsChannel | TextChannel,
  options: MessageFetchOptions = {}
) {
  let all_messages = await fetchAllMesages(channel, options);
  for (const message of all_messages) {
    if (message.thread) {
      const thread_messages = await fetchAllMesages(message.thread, options);
      all_messages = all_messages.concat(thread_messages);
    }
  }
  return all_messages;
}

export async function fetchAllMesages(
  channel: TextBasedChannel,
  { start, limit }: MessageFetchOptions = {}
) {
  const messages: Message[] = [];
  // Create message pointer
  let message = await channel.messages
    .fetch({ limit: 1, after: start ?? "0" }) // TODO: Check if 0 works correctly for starting at the beginning
    .then((messagePage) => (messagePage.size === 1 ? messagePage.at(0) : null));

  while (message && (limit === undefined || messages.length < limit)) {
    // container.logger.debug(`Fetching from ${message.id}`);
    await channel.messages.fetch({ limit: 100, after: message.id }).then((messagePage) => {
      // container.logger.debug(`Received ${messagePage.size} messages`);
      const sorted_messages_by_id = messagePage.sorted((a, b) =>
        BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0
      );
      messages.push(...sorted_messages_by_id.values());
      // Update our message pointer to be last message in page of messages
      message = 0 < sorted_messages_by_id.size ? sorted_messages_by_id.last() : null;
    });
  }
  return messages;
}
