import {
  Client,
  TextChannel,
  ForumChannel,
  Guild,
  GuildMember,
  AnyThreadChannel,
  Message,
  ButtonBuilder,
  ButtonComponentData,
  ButtonStyle,
  EmbedData,
} from "discord.js";

import {
  checkIfCanMarkSolution,
  makeMarkSolutionResponse,
  makeRequestForConsentString,
  PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED,
  QUESTION_ID_FIELD_NAME,
  SOLUTION_ID_FIELD_NAME,
} from "./mark-solution";
import { toAOChannelWithServer } from "~discord-bot/utils/conversions";

import type { ChannelWithFlags } from "@answeroverflow/api";
import { CONSENT_BUTTON_DATA } from "./consent";
import {
  mockGuild,
  mockTextChannel,
  mockForumChannel,
  mockGuildMember,
  mockPublicThread,
  mockMessage,
  overrideVariables,
  mockReaction,
  mockMarkedAsSolvedReply,
  testAllPermissions,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import { createChannelWithDeps } from "@answeroverflow/db";

let client: Client;
let guild: Guild;
let default_author: GuildMember;
let text_channel: TextChannel;
let forum_channel: ForumChannel;
let text_channel_thread: AnyThreadChannel;
let forum_channel_thread: AnyThreadChannel;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  guild = mockGuild(client);
  text_channel = mockTextChannel(client, guild);
  forum_channel = mockForumChannel(client, guild);
  default_author = mockGuildMember({ client, guild });
  text_channel_thread = mockPublicThread({
    client,
    parent_channel: text_channel,
  });
  forum_channel_thread = mockPublicThread({
    client,
    parent_channel: forum_channel,
  });
});

describe("Can Mark Solution", () => {
  describe("Check If Can Mark Solution Failures - Preconditions", () => {
    it("should fail if the possible solution message is not in a thread", async () => {
      const message = mockMessage({
        client,
        channel: text_channel,
        author: default_author.user,
      });
      await expect(checkIfCanMarkSolution(message, default_author.user)).rejects.toThrowError(
        "Cannot mark a message as a solution if it's not in a thread"
      );
    });
    it("should fail if the possible solution message is from Answer Overflow Bot", async () => {
      const message = mockMessage({
        client,
        channel: text_channel_thread,
        author: client.user!,
      });
      await expect(checkIfCanMarkSolution(message, default_author.user)).rejects.toThrowError(
        "Answer Overflow Bot messages can't be marked as a solution"
      );
    });
    it("should fail if the thread parent is not found", async () => {
      const message = mockMessage({
        client,
        channel: text_channel_thread,
      });
      overrideVariables(text_channel_thread, {
        parentId: randomSnowflake(),
      });
      await expect(checkIfCanMarkSolution(message, default_author.user)).rejects.toThrowError(
        "Could not find the parent channel of the thread"
      );
    });
    it("should fail if mark solution is not enabled in the channel", async () => {
      const message = mockMessage({
        client,
        channel: text_channel_thread,
      });
      await createChannelWithDeps({
        ...toAOChannelWithServer(text_channel),
        flags: {
          mark_solution_enabled: false,
        },
        solution_tag_id: "solved",
      });
      await expect(checkIfCanMarkSolution(message, default_author.user)).rejects.toThrowError(
        "Mark solution is not enabled in this channel"
      );
    });
  });
  describe("Check If Can Mark Solution Failures - Mark Solution Enabled", () => {
    it("should fail if the question message is not found for a text channel thread", async () => {
      await createChannelWithDeps({
        ...toAOChannelWithServer(text_channel),
        flags: {
          mark_solution_enabled: true,
        },
      });
      mockMessage({
        client,
        channel: text_channel,
      });
      const solution_message = mockMessage({
        client,
        channel: text_channel_thread,
      });
      await expect(
        checkIfCanMarkSolution(solution_message, default_author.user)
      ).rejects.toThrowError("Could not find the root message of the thread");
    });
    it("should fail if the question message is not found for a forum channel thread", async () => {
      await createChannelWithDeps({
        ...toAOChannelWithServer(forum_channel),
        flags: {
          mark_solution_enabled: true,
        },
      });
      mockMessage({
        client,
        channel: forum_channel_thread,
      });
      const solution_message = mockMessage({
        client,
        channel: forum_channel_thread,
      });
      await createChannelWithDeps({
        ...toAOChannelWithServer(text_channel),
        flags: {
          mark_solution_enabled: true,
        },
        solution_tag_id: "solved",
      });
      await expect(
        checkIfCanMarkSolution(solution_message, default_author.user)
      ).rejects.toThrowError("Could not find the root message of the thread");
    });
    it("should fail if the user is not the question author and does not have override permissions", async () => {
      await createChannelWithDeps({
        ...toAOChannelWithServer(text_channel),
        flags: {
          mark_solution_enabled: true,
        },
      });
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
      await expect(
        checkIfCanMarkSolution(solution_message, default_author.user)
      ).rejects.toThrowError(
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
        parent_channel: forum_channel,
        data: {
          applied_tags: ["solved"],
        },
      });
      mockMessage({
        client,
        channel: thread_with_solved_tag,
        author: default_author.user,
        override: {
          id: thread_with_solved_tag.id,
        },
      });
      const solution_message = mockMessage({
        client,
        channel: thread_with_solved_tag,
      });

      await createChannelWithDeps({
        ...toAOChannelWithServer(forum_channel),
        flags: {
          mark_solution_enabled: true,
        },
        solution_tag_id: "solved",
      });
      await expect(
        checkIfCanMarkSolution(solution_message, default_author.user)
      ).rejects.toThrowError("This question is already marked as solved");
    });
    it("should fail if the solution emoji is already set", async () => {
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
      await createChannelWithDeps({
        ...toAOChannelWithServer(text_channel),
        flags: {
          mark_solution_enabled: true,
        },
        solution_tag_id: "solved",
      });

      await expect(
        checkIfCanMarkSolution(solution_message, default_author.user)
      ).rejects.toThrowError("This question is already marked as solved");
    });
    it("should fail if the solution message is already sent", async () => {
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

      mockMarkedAsSolvedReply({
        client,
        channel: text_channel_thread,
        question_id: root_message.id,
        solution_id: solution_message.id,
      });

      await createChannelWithDeps({
        ...toAOChannelWithServer(text_channel),
        flags: {
          mark_solution_enabled: true,
        },
        solution_tag_id: "solved",
      });

      await expect(
        checkIfCanMarkSolution(solution_message, default_author.user)
      ).rejects.toThrowError("This question is already marked as solved");
    });
  });
  describe("Check If Can Mark Solution Success", () => {
    let question_message: Message;
    let solution_message: Message;
    beforeEach(async () => {
      await createChannelWithDeps({
        ...toAOChannelWithServer(text_channel),
        flags: {
          mark_solution_enabled: true,
        },
        solution_tag_id: "solved",
      });

      question_message = mockMessage({
        client,
        channel: text_channel,
        override: {
          id: text_channel_thread.id,
        },
        author: default_author.user,
      });
      solution_message = mockMessage({
        client,
        channel: text_channel_thread,
      });
    });
    it("should pass if the user is the question author", async () => {
      const { question, solution, server, thread, parent_channel, channel_settings } =
        await checkIfCanMarkSolution(solution_message, default_author.user);
      expect(question).toEqual(question_message);
      expect(solution).toEqual(solution_message);
      expect(server).toEqual(text_channel.guild);
      expect(thread).toEqual(text_channel_thread);
      expect(parent_channel).toEqual(text_channel);
      expect(channel_settings.solution_tag_id).toEqual("solved");
    });
    it("should pass if the user has administrator", async () => {
      await testAllPermissions({
        permissions_that_should_work: [
          "Administrator",
          "ManageChannels",
          "ManageThreads",
          "ManageGuild",
        ],
        async operation(permission, is_permission_allowed) {
          const solver = mockGuildMember({
            client,
            guild: text_channel.guild,
            permissions: permission,
          });
          let did_error = false;
          try {
            const { question, solution } = await checkIfCanMarkSolution(
              solution_message,
              solver.user
            );
            expect(question).toEqual(question_message);
            expect(solution).toEqual(solution_message);
          } catch (error) {
            did_error = true;
          }
          expect(did_error).toEqual(!is_permission_allowed);
        },
      });
    });
  });
});

describe("Make Mark Solution Response", () => {
  let question: Message;
  let solution: Message;
  let settings: ChannelWithFlags;
  let jump_to_solution_button_data: Partial<ButtonComponentData>;
  const solution_message_without_consent_request =
    "**Thank you for marking this question as solved!**";
  let solution_message_with_consent_request: string;
  let solution_embed_data: Partial<EmbedData>;
  beforeEach(() => {
    question = mockMessage({
      client,
      channel: text_channel,
      override: {
        id: text_channel_thread.id,
      },
    });
    solution = mockMessage({
      client,
      channel: text_channel_thread,
    });
    settings = {
      ...toAOChannelWithServer(text_channel),
      flags: {
        mark_solution_enabled: true,
        auto_thread_enabled: true,
        forum_guidelines_consent_enabled: true,
        indexing_enabled: true,
        send_mark_solution_instructions_in_new_threads: true,
      },
      invite_code: null,
      solution_tag_id: "solved",
      last_indexed_snowflake: null,
    };
    jump_to_solution_button_data = new ButtonBuilder()
      .setLabel("Jump To Solution")
      .setURL(solution.url)
      .setStyle(ButtonStyle.Link).data;
    solution_message_with_consent_request = [
      `**Thank you for marking this question as solved!**`,
      makeRequestForConsentString(text_channel.guild.name),
    ].join("\n\n");
    solution_embed_data = {
      description: solution_message_with_consent_request,
      color: 9228799,
      fields: [
        {
          name: QUESTION_ID_FIELD_NAME,
          value: question.id,
          inline: true,
        },
        {
          name: SOLUTION_ID_FIELD_NAME,
          value: solution.id,
          inline: true,
        },
        {
          name: "Learn more",
          value: "https://answeroverflow.com",
        },
      ],
    } as EmbedData;
  });

  it("should make a response with a consent button and prompt in a channel with indexing enabled and forum guidelines consent disabled", () => {
    const { components, embed } = makeMarkSolutionResponse({
      question,
      solution,
      server_name: text_channel.guild.name,
      settings: {
        ...settings,
        flags: {
          ...settings.flags,
          indexing_enabled: true,
          forum_guidelines_consent_enabled: false,
        },
      },
    });
    expect(components!.components.map((component) => component.data)).toEqual([
      CONSENT_BUTTON_DATA,
      jump_to_solution_button_data,
    ]);
    expect(embed.data).toEqual(solution_embed_data);
  });
  it("should make a response with only the solution response a channel with indexing enabled and forum guidelines consent enabled", () => {
    const { components, embed } = makeMarkSolutionResponse({
      question,
      solution,
      server_name: text_channel.guild.name,
      settings: {
        ...settings,
        flags: {
          ...settings.flags,
          indexing_enabled: true,
          forum_guidelines_consent_enabled: true,
        },
      },
    });
    expect(components!.components.map((component) => component.data)).toEqual([
      jump_to_solution_button_data,
    ]);
    expect(embed.data).toEqual({
      ...solution_embed_data,
      description: solution_message_without_consent_request,
    });
  });
});
