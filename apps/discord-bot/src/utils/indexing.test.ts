import {
  AnyThreadChannel,
  ChannelType,
  Client,
  ForumChannel,
  Message,
  MessageType,
  NewsChannel,
  Options,
  TextChannel,
} from "discord.js";
import {
  mockForumChannel,
  mockMarkedAsSolvedReply,
  mockMessage,
  mockMessages,
  mockNewsChannel,
  mockPublicThread,
  mockTextChannel,
  mockThreadFromParentMessage,
} from "~discord-bot/test/utils/discordjs/channel-mock";
import { clearDatabase, Message as AOMessage } from "@answeroverflow/db";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { mockGuildMember } from "~discord-bot/test/utils/discordjs/user-mock";
import { testOnlyAPICall } from "~discord-bot/test/utils/helpers";
import { toAOChannelWithServer, toAODiscordAccount, toAOMessage, toAOServer } from "./conversions";
import {
  addSolutionsToMessages,
  fetchAllChannelMessagesWithThreads,
  fetchAllMesages,
  filterMessages,
  findSolutionsToMessage,
  indexRootChannel,
} from "./indexing";
import type { inferRouterInputs } from "@trpc/server";
import type { botRouter } from "@answeroverflow/api";
import { isSnowflakeLargerAsInt, randomSnowflake } from "./utils";

let client: Client;
let text_channel: TextChannel;
let forum_channel: ForumChannel;
let news_channel: NewsChannel;
beforeEach(async () => {
  const data = await setupBot({
    // Cache everything is used to simulate getting a response back from the API
    makeCache: Options.cacheEverything(),
  });
  client = data.client;
  text_channel = mockTextChannel(client);
  forum_channel = mockForumChannel(client);
  news_channel = mockNewsChannel({ client });
  await clearDatabase();
});

async function validateIndexingResults(input: {
  messages: Message[];
  threads?: AnyThreadChannel[];
  expected_threads: number;
  expected_users: number;
  expected_messages: number;
}) {
  const { messages, threads = [], expected_threads, expected_users, expected_messages } = input;
  const user_ids = messages.map((msg) => msg.author.id);

  const fetched_users = await testOnlyAPICall((router) =>
    router.discord_accounts.byIdMany(user_ids)
  );
  expect(fetched_users!.length).toBe(expected_users);

  const message_ids = messages.map((msg) => msg.id);
  const fetched_messages = await testOnlyAPICall((router) => router.messages.byIdBulk(message_ids));
  expect(fetched_messages!.length).toBe(expected_messages);

  const thread_ids = threads.map((thread) => thread.id);
  const fetched_threads = await testOnlyAPICall((router) => router.channels.byIdMany(thread_ids));
  expect(fetched_threads!.length).toBe(expected_threads);
}

async function upsertChannelSettings(
  channel: TextChannel | ForumChannel | NewsChannel,
  opts: Omit<
    inferRouterInputs<typeof botRouter>["channel_settings"]["upsertWithDeps"],
    "channel"
  > = {}
) {
  const settings = await testOnlyAPICall((router) =>
    router.channel_settings.upsertWithDeps({ channel: toAOChannelWithServer(channel), ...opts })
  );
  return settings!;
}

describe("Indexing", () => {
  test.todo("Validate Message Fetch Options");
  describe("Index Root Channel", () => {
    it("should skip a channel with indexing disabled", async () => {
      const settings = await upsertChannelSettings(text_channel);
      expect(settings.flags.indexing_enabled).toBeFalsy();
      const messages = mockMessages(text_channel, 100);

      await indexRootChannel(text_channel);
      await validateIndexingResults({
        messages,
        expected_threads: 0,
        expected_users: 0,
        expected_messages: 0,
      });
    });
    it("should index a text channel", async () => {
      const settings = await upsertChannelSettings(text_channel, {
        flags: {
          indexing_enabled: true,
        },
      });
      expect(settings.flags.indexing_enabled).toBeTruthy();
      const messages = mockMessages(text_channel, 100);

      await indexRootChannel(text_channel);

      await validateIndexingResults({
        messages,
        expected_threads: 0,
        expected_users: 100,
        expected_messages: 100,
      });
    });
    it.only("should index a news channel", async () => {
      const settings = await upsertChannelSettings(news_channel, {
        flags: {
          indexing_enabled: true,
        },
      });
      expect(settings.flags.indexing_enabled).toBeTruthy();
      const messages = mockMessages(news_channel, 100);
      const thread1 = mockThreadFromParentMessage({
        client,
        parent_message: messages[0]!,
        data: {
          type: ChannelType.AnnouncementThread,
        },
      });
      messages.push(...mockMessages(thread1, 10));
      const thread2 = mockThreadFromParentMessage({
        client,
        parent_message: messages[1]!,
        data: {
          type: ChannelType.AnnouncementThread,
        },
      });
      messages.push(...mockMessages(thread2, 10));

      await indexRootChannel(news_channel);

      await validateIndexingResults({
        messages,
        threads: [thread1, thread2],
        expected_threads: 2,
        expected_users: 120,
        expected_messages: 120,
      });
    });
    it("should update last indexed snowflake after indexing", async () => {
      const settings = await upsertChannelSettings(text_channel, {
        flags: {
          indexing_enabled: true,
        },
      });
      expect(settings.flags.indexing_enabled).toBeTruthy();
      const messages = mockMessages(text_channel, 100);
      await indexRootChannel(text_channel);
      const largest_id = messages.sort((a, b) => isSnowflakeLargerAsInt(a.id, b.id)).at(-1)!.id;
      const updated_settings = await testOnlyAPICall((router) =>
        router.channel_settings.byId(text_channel.id)
      );
      expect(updated_settings!.last_indexed_snowflake).toBe(largest_id);
    });
    it("should start indexing from the last indexed snowflake", async () => {
      await upsertChannelSettings(text_channel, {
        flags: {
          indexing_enabled: true,
        },
        last_indexed_snowflake: "100",
      });

      for (let i = 0; i < 100; i++) {
        mockMessage({
          client,
          channel: text_channel,
          override: {
            id: `${i}`,
          },
        });
      }
      const messages: Message[] = [];
      for (let i = 100; i <= 200; i++) {
        messages.push(
          mockMessage({
            client,
            channel: text_channel,
            override: {
              id: `${i}`,
            },
          })
        );
      }
      await indexRootChannel(text_channel);
      await validateIndexingResults({
        messages,
        expected_threads: 0,
        expected_users: 100,
        expected_messages: 100,
      });
    });
    it("should index a forum channel", async () => {
      const settings = await upsertChannelSettings(forum_channel, {
        flags: {
          indexing_enabled: true,
        },
      });
      expect(settings.flags.indexing_enabled).toBeTruthy();
      const thread1 = mockPublicThread({
        client,
        parent_channel: forum_channel,
      });
      const thread2 = mockPublicThread({
        client,
        parent_channel: forum_channel,
      });
      const thread1_messages = mockMessages(thread1, 100);
      const thread2_messages = mockMessages(thread2, 100);
      const messages = [...thread1_messages, ...thread2_messages];

      await indexRootChannel(forum_channel);

      await validateIndexingResults({
        messages,
        threads: [thread1, thread2],
        expected_threads: 2,
        expected_users: 200,
        expected_messages: 200,
      });
    });
  });
  describe("Add Solutions To Messages", () => {
    let question_message: Message;
    let solution_message: Message;
    let marked_as_solved_reply: Message;
    let question_message_as_ao_message: AOMessage;
    let solution_message_as_ao_message: AOMessage;
    let marked_as_solved_reply_as_ao_message: AOMessage;
    let messages: Message[];
    beforeEach(() => {
      question_message = mockMessage({ client });
      solution_message = mockMessage({ client });
      marked_as_solved_reply = mockMarkedAsSolvedReply(
        client,
        question_message.id,
        solution_message.id
      );
      messages = [question_message, solution_message, marked_as_solved_reply];
      question_message_as_ao_message = toAOMessage(question_message);
      solution_message_as_ao_message = toAOMessage(solution_message);
      marked_as_solved_reply_as_ao_message = toAOMessage(marked_as_solved_reply);
    });
    it("should add solutions to messages with reply at the end", () => {
      addSolutionsToMessages(messages, [
        question_message_as_ao_message,
        solution_message_as_ao_message,
        marked_as_solved_reply_as_ao_message,
      ]);
      expect(question_message_as_ao_message.solutions).toEqual([solution_message_as_ao_message.id]);
    });
    it("should add solutions to messages with reply in the middle", () => {
      addSolutionsToMessages(messages, [
        question_message_as_ao_message,
        marked_as_solved_reply_as_ao_message,
        solution_message_as_ao_message,
      ]);
      expect(question_message_as_ao_message.solutions).toEqual([solution_message_as_ao_message.id]);
    });
    it("should add solutions to messages with reply at the beginning", () => {
      addSolutionsToMessages(messages, [
        marked_as_solved_reply_as_ao_message,
        question_message_as_ao_message,
        solution_message_as_ao_message,
      ]);
      expect(question_message_as_ao_message.solutions).toEqual([solution_message_as_ao_message.id]);
    });
  });
  describe("Find Solutions To Messages", () => {
    it("should find solutions from a mark as solved reply", () => {
      const question_message = mockMessage({ client });
      const solution_message = mockMessage({ client });
      const marked_as_solved_reply = mockMarkedAsSolvedReply(
        client,
        question_message.id,
        solution_message.id
      );
      const { question_id, solution_id } = findSolutionsToMessage(marked_as_solved_reply);
      expect(question_id).toBe(question_message.id);
      expect(solution_id).toBe(solution_message.id);
    });
    it("should not find solutions on a regular message", () => {
      const regular_message = mockMessage({ client });
      const { question_id, solution_id } = findSolutionsToMessage(regular_message);
      expect(question_id).toBeNull();
      expect(solution_id).toBeNull();
    });
    it("should not find solutions from a mark as solved reply that is not sent by the bot", () => {
      const question_message = mockMessage({ client });
      const solution_message = mockMessage({ client });
      const marked_as_solved_reply = mockMarkedAsSolvedReply(
        client,
        question_message.id,
        solution_message.id,
        {
          author: {
            id: randomSnowflake().toString(),
            avatar: "123",
            username: "123",
            discriminator: "123",
          },
        }
      );
      const { question_id, solution_id } = findSolutionsToMessage(marked_as_solved_reply);
      expect(question_id).toBeNull();
      expect(solution_id).toBeNull();
    });
  });
  describe("Filter Messages", () => {
    it("should filter system messages", async () => {
      const system_msg = mockMessage({
        client,
        channel: text_channel,
        override: {
          type: MessageType.UserJoin,
        },
      });
      const filtered_messages = await filterMessages([system_msg], text_channel);
      expect(filtered_messages.length).toBe(0);
    });
    it("should filter messages from users with message indexing disabled", async () => {
      const member_to_ignore = mockGuildMember({ client, guild: text_channel.guild });
      const message_to_ignore = mockMessage({
        client,
        channel: text_channel,
        author: member_to_ignore.user,
      });
      const settings = await testOnlyAPICall(async (router) => {
        await router.servers.upsert(toAOServer(member_to_ignore.guild));
        return router.user_server_settings.upsertWithDeps({
          user: toAODiscordAccount(member_to_ignore.user),
          server_id: member_to_ignore.guild.id,
          flags: {
            message_indexing_disabled: true,
          },
        });
      });
      expect(settings!.flags.message_indexing_disabled).toBe(true);
      const filtered_messages = await filterMessages([message_to_ignore], text_channel);
      expect(filtered_messages.length).toBe(0);
    });
    it("should not filter normal users", async () => {
      const msg1 = mockMessage({ client, channel: text_channel });
      const msg2 = mockMessage({ client, channel: text_channel });
      const filtered_messages = await filterMessages([msg1, msg2], text_channel);
      expect(filtered_messages.length).toBe(2);
    });
  });
  describe("Fetch All Channel Messages With Threads", () => {
    describe("Text Channel", () => {
      it("should fetch all messages from a text channel with no threads", async () => {
        const number_of_messages = 1245;
        mockMessages(text_channel, number_of_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(text_channel);
        expect(messages.length).toBe(number_of_messages);
      });
      it("should fetch all messages from a text channel one archived thread", async () => {
        const thread = mockThreadFromParentMessage({
          client,
          data: {
            thread_metadata: {
              auto_archive_duration: 60,
              archive_timestamp: new Date().toISOString(),
              archived: true,
            },
          },
          parent_message: mockMessage({ client, channel: text_channel }),
        });
        const number_of_thread_messages = 300;
        mockMessages(thread, number_of_thread_messages);
        const number_of_text_channel_messages = 1245;
        mockMessages(text_channel, number_of_text_channel_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(text_channel);
        expect(messages.length).toBe(
          number_of_thread_messages + number_of_text_channel_messages + 1
        );
      });
      it("should fetch all messages from a text channel with one active thread", async () => {
        const thread = mockThreadFromParentMessage({
          client,
          parent_message: mockMessage({ client, channel: text_channel }),
        });
        const number_of_thread_messages = 300;
        mockMessages(thread, number_of_thread_messages);
        const number_of_text_channel_messages = 1245;
        mockMessages(text_channel, number_of_text_channel_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(text_channel);
        expect(messages.length).toBe(
          number_of_text_channel_messages + number_of_thread_messages + 1
        );
      });
      it("should fetch all messages from a text channel with an active and archived thread", async () => {
        const archived_thread = mockThreadFromParentMessage({
          client,
          data: {
            thread_metadata: {
              auto_archive_duration: 60,
              archive_timestamp: new Date().toISOString(),
              archived: true,
            },
          },
          parent_message: mockMessage({ client, channel: text_channel }),
        });
        const active_thread = mockThreadFromParentMessage({
          client,
          parent_message: mockMessage({ client, channel: text_channel }),
        });
        const number_of_archived_thread_messages = 300;
        mockMessages(archived_thread, number_of_archived_thread_messages);
        const number_of_active_thread_messages = 300;
        mockMessages(active_thread, number_of_active_thread_messages);
        const number_of_text_channel_messages = 1245;
        mockMessages(text_channel, number_of_text_channel_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(text_channel);
        expect(messages.length).toBe(
          number_of_archived_thread_messages +
            number_of_active_thread_messages +
            number_of_text_channel_messages +
            2
        );
      });
    });
    describe("News Channel", () => {
      it("should fetch all messages from a news channel with no threads", async () => {
        const number_of_messages = 1245;
        mockMessages(news_channel, number_of_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(news_channel);
        expect(messages.length).toBe(number_of_messages);
      });
      it("should fetch all messages from a news channel with one archived thread", async () => {
        const thread = mockThreadFromParentMessage({
          client,
          data: {
            thread_metadata: {
              auto_archive_duration: 60,
              archive_timestamp: new Date().toISOString(),
              archived: true,
            },
            type: ChannelType.AnnouncementThread,
          },
          parent_message: mockMessage({ client, channel: news_channel }),
        });
        const number_of_thread_messages = 300;
        mockMessages(thread, number_of_thread_messages);
        const number_of_news_channel_messages = 1245;
        mockMessages(news_channel, number_of_news_channel_messages);
        const { messages, threads } = await fetchAllChannelMessagesWithThreads(news_channel);
        expect(messages.length).toBe(
          number_of_thread_messages + number_of_news_channel_messages + 1
        );
        expect(threads.length).toBe(1);
      });
      it("should fetch all messages from a news channel with one active thread", async () => {
        const thread = mockThreadFromParentMessage({
          client,
          data: {
            type: ChannelType.AnnouncementThread,
          },
          parent_message: mockMessage({ client, channel: news_channel }),
        });
        const number_of_thread_messages = 300;
        mockMessages(thread, number_of_thread_messages);
        const number_of_news_channel_messages = 1245;
        mockMessages(news_channel, number_of_news_channel_messages);
        const { messages, threads } = await fetchAllChannelMessagesWithThreads(news_channel);
        expect(messages.length).toBe(
          number_of_news_channel_messages + number_of_thread_messages + 1
        );
        expect(threads.length).toBe(1);
      });
    });
    describe("Forum Channel", () => {
      it("should fetch all messages from a forum channel with no threads", async () => {
        const { messages } = await fetchAllChannelMessagesWithThreads(forum_channel);
        expect(messages.length).toBe(0);
      });
      it("should fetch all messages from a forum channel with one archived thread", async () => {
        const thread = mockPublicThread({
          client,
          data: {
            thread_metadata: {
              auto_archive_duration: 60,
              archive_timestamp: new Date().toISOString(),
              archived: true,
            },
          },
          parent_channel: forum_channel,
        });
        const number_of_thread_messages = 300;
        mockMessages(thread, number_of_thread_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(forum_channel);
        expect(messages.length).toBe(number_of_thread_messages);
      });
      it("should fetch all messages from a forum channel with one active thread", async () => {
        const thread = mockPublicThread({
          client,
          data: {
            thread_metadata: {
              auto_archive_duration: 60,
              archive_timestamp: new Date().toISOString(),
              archived: false,
            },
          },
          parent_channel: forum_channel,
        });
        const number_of_thread_messages = 300;
        mockMessages(thread, number_of_thread_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(forum_channel);
        expect(messages.length).toBe(number_of_thread_messages);
      });
      it("should fetch all messages from a forum channel with an active and archived thread", async () => {
        const archived_thread = mockPublicThread({
          client,
          data: {
            thread_metadata: {
              auto_archive_duration: 60,
              archive_timestamp: new Date().toISOString(),
              archived: true,
            },
          },
          parent_channel: forum_channel,
        });
        const active_thread = mockPublicThread({
          client,
          parent_channel: forum_channel,
        });
        const number_of_archived_thread_messages = 300;
        mockMessages(archived_thread, number_of_archived_thread_messages);
        const number_of_active_thread_messages = 300;
        mockMessages(active_thread, number_of_active_thread_messages);
        const { messages } = await fetchAllChannelMessagesWithThreads(forum_channel);
        expect(messages.length).toBe(
          number_of_archived_thread_messages + number_of_active_thread_messages
        );
      });
    });
  });
  describe("Fetch All Messages", () => {
    const number_of_messages = 1425;
    beforeEach(() => {
      for (let id = 1; id <= number_of_messages; id++) {
        mockMessage({
          client,
          channel: text_channel,
          override: {
            id: `${id}`,
          },
        });
      }
    });
    it("should fetch all messages", async () => {
      const messages = await fetchAllMesages(text_channel);
      expect(messages.length).toBe(number_of_messages);
    });
    it("should fetch all messages with a limit", async () => {
      const limit = 36;
      const messages = await fetchAllMesages(text_channel, { limit });
      expect(messages.length).toBe(limit);
    });
    it("should fetch all messages with a limit and a start", async () => {
      const limit = 36;
      const start = 100;
      const messages = await fetchAllMesages(text_channel, { limit, start: `${start}` });
      expect(messages.length).toBe(limit);
      expect(messages[0]!.id).toBe(`${start + 1}`);
    });
    it("should return the messages sorted from oldest to newest", async () => {
      const messages = await fetchAllMesages(text_channel);
      expect(messages.length).toBe(number_of_messages);
      for (let id = 0; id < number_of_messages; id++) {
        expect(messages[id]!.id).toBe(`${id + 1}`);
      }
    });
  });
});
