import { Client, ForumChannel, MessageType, Options, TextChannel } from "discord.js";
import {
  mockForumChannel,
  mockMessage,
  mockMessages,
  mockPublicThread,
  mockTextChannel,
  mockThreadFromParentMessage,
} from "~discord-bot/test/utils/discordjs/channel-mock";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { mockGuildMember } from "~discord-bot/test/utils/discordjs/user-mock";
import { testOnlyAPICall } from "~discord-bot/test/utils/helpers";
import { toAODiscordAccount, toAOServer } from "./conversions";
import { fetchAllChannelMessagesWithThreads, fetchAllMesages, filterMessages } from "./indexing";

let client: Client;
let text_channel: TextChannel;
let forum_channel: ForumChannel;
beforeEach(async () => {
  const data = await setupBot({
    // Cache everything is used to simulate getting a response back from the API
    makeCache: Options.cacheEverything(),
  });
  client = data.client;
  text_channel = mockTextChannel(client);
  forum_channel = mockForumChannel(client);
});

describe("Indexing", () => {
  describe("Index Root Channel", () => {
    it("should index root channel with a text channel", async () => {});
    it("should index root channel with a news channel", async () => {});
    it("should index root channel with a forum channel", async () => {});
  });
  describe("Add Solutions To Messages", () => {
    it("should add solutions to messages", async () => {});
  });
  describe("Convert To AO Data Types", () => {
    it("should convert multiple of the same user to one user", async () => {});
    it("should convert multiple of the same thread to one thread", async () => {});
    it("should convert multiple of the same message to one message", async () => {});
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
        const messages = await fetchAllChannelMessagesWithThreads(text_channel);
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
        const messages = await fetchAllChannelMessagesWithThreads(text_channel);
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
        const messages = await fetchAllChannelMessagesWithThreads(text_channel);
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
        const messages = await fetchAllChannelMessagesWithThreads(text_channel);
        expect(messages.length).toBe(
          number_of_archived_thread_messages +
            number_of_active_thread_messages +
            number_of_text_channel_messages +
            2
        );
      });
    });
    describe("News Channel", () => {});
    describe("Forum Channel", () => {
      it("should fetch all messages from a forum channel with no threads", async () => {
        const messages = await fetchAllChannelMessagesWithThreads(forum_channel);
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
        const messages = await fetchAllChannelMessagesWithThreads(forum_channel);
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
        const messages = await fetchAllChannelMessagesWithThreads(forum_channel);
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
        const messages = await fetchAllChannelMessagesWithThreads(forum_channel);
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
      expect(messages[0].id).toBe(`${start + 1}`);
    });
    it("should return the messages sorted from oldest to newest", async () => {
      const messages = await fetchAllMesages(text_channel);
      expect(messages.length).toBe(number_of_messages);
      for (let id = 0; id < number_of_messages; id++) {
        expect(messages[id].id).toBe(`${id + 1}`);
      }
    });
  });
});
