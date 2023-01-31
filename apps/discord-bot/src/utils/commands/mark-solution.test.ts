import type {
  Client,
  TextChannel,
  ForumChannel,
  NewsChannel,
  Guild,
  GuildMember,
  AnyThreadChannel,
} from "discord.js";
import { clearDatabase } from "@answeroverflow/db";
import {
  mockTextChannel,
  mockPublicThread,
  mockForumChannel,
  mockNewsChannel,
  mockMessage,
  mockReaction,
} from "~discord-bot/test/utils/discordjs/channel-mock";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { mockGuildMember } from "~discord-bot/test/utils/discordjs/user-mock";
import { checkIfCanMarkSolution, PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED } from "./mark-solution";
import { overrideVariables, testOnlyAPICall } from "~discord-bot/test/utils/helpers";
import { toAOChannelWithServer } from "../conversions";
import { mockGuild } from "~discord-bot/test/utils/discordjs/guild-mock";

let client: Client;
let guild: Guild;
let default_author: GuildMember;
let text_channel: TextChannel;
let forum_channel: ForumChannel;
let news_channel: NewsChannel;
let text_channel_thread: AnyThreadChannel;
let forum_channel_thread: AnyThreadChannel;
beforeEach(async () => {
  const data = await setupBot();
  client = data.client;
  guild = mockGuild(client);
  text_channel = mockTextChannel(client, guild);
  forum_channel = mockForumChannel(client, guild);
  news_channel = mockNewsChannel({ client, guild });
  default_author = mockGuildMember({ client, guild });
  text_channel_thread = mockPublicThread({
    client,
    parent_channel: text_channel,
  });
  forum_channel_thread = mockPublicThread({
    client,
    parent_channel: forum_channel,
  });
  await clearDatabase();
});

describe("Mark Solution Tests", () => {
  describe("Check If Can Mark Solution Failures - Preconditions", () => {
    it("should fail if the possible solution message is not in a thread", async () => {
      const message = mockMessage({
        client,
        channel: text_channel,
        author: default_author.user,
      });
      await expect(checkIfCanMarkSolution(message, default_author)).rejects.toThrowError(
        "Cannot mark a message as a solution if it's not in a thread"
      );
    });
    it("should fail if the possible solution message is from Answer Overflow Bot", async () => {
      const message = mockMessage({
        client,
        channel: text_channel_thread,
        author: client.user!,
      });
      await expect(checkIfCanMarkSolution(message, default_author)).rejects.toThrowError(
        "Answer Overflow Bot messages can't be marked as a solution"
      );
    });
    it("should fail if the thread parent is not found", async () => {
      const message = mockMessage({
        client,
        channel: text_channel_thread,
      });
      overrideVariables(text_channel_thread, {
        parentId: "1234567890",
      });
      await expect(checkIfCanMarkSolution(message, default_author)).rejects.toThrowError(
        "Could not find the parent channel of the thread"
      );
    });
    it("should fail if mark solution is not enabled in the channel", async () => {
      const message = mockMessage({
        client,
        channel: text_channel_thread,
      });
      await expect(checkIfCanMarkSolution(message, default_author)).rejects.toThrowError(
        "Mark solution is not enabled in this channel"
      );
    });
  });
  describe("Check If Can Mark Solution Failures - Mark Solution Enabled", () => {
    beforeEach(async () => {
      await testOnlyAPICall(async (router) => {
        await router.channel_settings.upsertWithDeps({
          channel: toAOChannelWithServer(text_channel),
          flags: {
            mark_solution_enabled: true,
          },
        });
        await router.channel_settings.upsertWithDeps({
          channel: toAOChannelWithServer(forum_channel),
          flags: {
            mark_solution_enabled: true,
          },
        });
      });
    });
    it("should fail if the question message is not found for a text channel thread", async () => {
      mockMessage({
        client,
        channel: text_channel,
      });
      const solution_message = mockMessage({
        client,
        channel: text_channel_thread,
      });
      await expect(checkIfCanMarkSolution(solution_message, default_author)).rejects.toThrowError(
        "Could not find the root message of the thread"
      );
    });
    it("should fail if the question message is not found for a forum channel thread", async () => {
      mockMessage({
        client,
        channel: forum_channel_thread,
      });
      const solution_message = mockMessage({
        client,
        channel: forum_channel_thread,
      });
      await expect(checkIfCanMarkSolution(solution_message, default_author)).rejects.toThrowError(
        "Could not find the root message of the thread"
      );
    });
    it("should fail if the user is not the question author and does not have override permissions", async () => {
      mockMessage({
        client,
        channel: text_channel,
        override: {
          id: text_channel_thread.id,
        },
      });
      const solution_message = mockMessage({
        client,
        channel: text_channel_thread,
      });
      await expect(checkIfCanMarkSolution(solution_message, default_author)).rejects.toThrowError(
        `You don't have permission to mark this question as solved. Only the thread author or users with the permissions ${PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED.join(
          ", "
        )} can mark a question as solved.`
      );
    });
  });
  describe("Check If Can Mark Solution Failures - Solved Indicator Applied Already", () => {
    it("should fail if the solution tag is already set", async () => {
      const thread_with_solved_tag = mockPublicThread({
        client,
        parent_channel: text_channel,
        data: {
          applied_tags: ["solved"],
        },
      });
      mockMessage({
        client,
        channel: text_channel,
        author: default_author.user,
        override: {
          id: thread_with_solved_tag.id,
        },
      });
      const solution_message = mockMessage({
        client,
        channel: thread_with_solved_tag,
      });
      await testOnlyAPICall(async (router) => {
        await router.channel_settings.upsertWithDeps({
          channel: toAOChannelWithServer(text_channel),
          solution_tag_id: "solved",
          flags: {
            mark_solution_enabled: true,
          },
        });
      });
      await expect(checkIfCanMarkSolution(solution_message, default_author)).rejects.toThrowError(
        "This question is already marked as solved"
      );
    });
    it.only("should fail if the solution emoji is already set", async () => {
      const root_message = mockMessage({
        client,
        channel: text_channel,
        author: default_author.user,
        override: {
          id: text_channel_thread.id,
        },
      });

      const solution_message = mockMessage({
        client,
        channel: text_channel_thread,
      });

      mockReaction({
        message: root_message,
        user: root_message.client.user,
        override: {
          emoji: {
            name: "✅",
            id: "✅",
          },
        },
      });

      await testOnlyAPICall(async (router) => {
        await router.channel_settings.upsertWithDeps({
          channel: toAOChannelWithServer(text_channel),
          solution_tag_id: "solved",
          flags: {
            mark_solution_enabled: true,
          },
        });
      });
      await expect(checkIfCanMarkSolution(solution_message, default_author)).rejects.toThrowError(
        "This question is already marked as solved"
      );
    });
    it("should fail if the solution message is already sent", async () => {});
  });
});
describe("Check If Can Mark Solution Success", () => {
  it("should pass if the user is the question author", async () => {});
  it("should pass if the user has override permissions", async () => {});
});
