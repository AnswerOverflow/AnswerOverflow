import type { DiscordAccount, Thread, Message as AOMessage } from "@answeroverflow/db";
import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import {
  AnyThreadChannel,
  ChannelType,
  Client,
  Events,
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
import { callAPI, callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";

@ApplyOptions<Listener.Options>({ once: true, event: Events.ClientReady })
export class OnMessage extends Listener {
  public run(client: Client) {
    setInterval(() => {
      void indexServers(client);
    }, process.env.INDEXING_INTERVAL_IN_HOURS);
  }
}

async function indexServers(client: Client) {
  for (const guild of client.guilds.cache.values()) {
    await indexServer(guild);
  }
}

async function indexServer(guild: Guild) {
  for (const channel of guild.channels.cache.values()) {
    await indexRootChannel(channel);
  }
}

async function indexRootChannel(channel: GuildBasedChannel) {
  const settings = await callApiWithConsoleStatusHandler({
    ApiCall: (router) => router.channel_settings.byId(channel.id),
    getCtx: createAnswerOveflowBotCtx,
    error_message: `Failed to get channel settings for channel ${channel.id}`,
    success_message: `Got channel settings for channel ${channel.id}`,
  });
  const has_indexing_enabled = !settings || !settings.flags.indexing_enabled;
  const is_indexable_channel_type =
    channel.type === ChannelType.GuildText ||
    channel.type === ChannelType.GuildAnnouncement ||
    channel.type === ChannelType.GuildForum;

  if (!has_indexing_enabled || !is_indexable_channel_type) {
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
      await router.discord_accounts.upsertBulk(converted_users);
      await router.channels.upsertWithDeps(toAOChannelWithServer(channel));
      await router.channels.upsertMany(converted_threads);
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
  const converted_users = new Set<DiscordAccount>();
  const converted_threads = new Set<Thread>();
  const converted_messages = new Set<AOMessage>();
  for (const msg of messages) {
    converted_users.add(toAODiscordAccount(msg.author));
    if (msg.thread) {
      converted_threads.add(toAOThread(msg.thread));
    }
    converted_messages.add(toAOMessage(msg));
  }
  return {
    converted_users: [...converted_users],
    converted_threads: [...converted_threads],
    converted_messages: [...converted_messages],
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
  const collected_messages: Message[] = [];
  if (channel.type === ChannelType.GuildForum) {
    const archived_threads = await channel.threads.fetchArchived({
      type: "public",
      fetchAll: true,
    });
    const active_threads = await channel.threads.fetchActive();
    const threads = [...archived_threads.threads.values(), ...active_threads.threads.values()];
    for (const thread of threads) {
      const thread_messages = await fetchAllThreadMessages(thread);
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
      const thread_messages = await fetchAllThreadMessages(message.thread, options);
      all_messages = all_messages.concat(thread_messages);
    }
  }
  return all_messages;
}

async function fetchAllThreadMessages(thread: AnyThreadChannel, options: MessageFetchOptions = {}) {
  return fetchAllMesages(thread, options);
}

async function fetchAllMesages(
  channel: TextBasedChannel,
  { start, limit }: MessageFetchOptions = {}
) {
  const messages: Message[] = [];
  // Create message pointer
  let message = await channel.messages
    .fetch({ limit: 1, after: start ?? "0" }) // TODO: Check if 0 works correctly for starting at the beginning
    .then((messagePage) => (messagePage.size === 1 ? messagePage.at(0) : null));

  while (message && (limit === undefined || messages.length < limit)) {
    await channel.messages.fetch({ limit: 100, after: message.id }).then((messagePage) => {
      messagePage.forEach((msg) => messages.push(msg));

      // Update our message pointer to be last message in page of messages
      message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
    });
  }
  return messages;
}
