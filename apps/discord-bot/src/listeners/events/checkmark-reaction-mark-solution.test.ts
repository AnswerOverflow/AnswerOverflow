import { clearDatabase } from "@answeroverflow/db";
import { Client, Events } from "discord.js";
import {
  mockMessage,
  mockMessageReaction,
  mockPublicThread,
  mockTextChannel,
} from "~discord-bot/test/utils/discordjs/channel-mock";
import { mockGuild } from "~discord-bot/test/utils/discordjs/guild-mock";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { mockGuildMember } from "~discord-bot/test/utils/discordjs/user-mock";
import { emitEvent, testOnlyAPICall } from "~discord-bot/test/utils/helpers";
import { toAOChannelWithServer } from "~discord-bot/utils/conversions";

let client: Client;
beforeEach(async () => {
  await clearDatabase();
  const data = await setupBot();
  client = data.client;
});

async function setupSolvedMessageScenario(guild_id?: string) {
  const guild = mockGuild(client, undefined, {
    id: guild_id,
  });
  const default_author = mockGuildMember({ client, guild });
  const text_channel = mockTextChannel(client, guild);
  const text_channel_thread = mockPublicThread({
    client,
    parent_channel: text_channel,
  });
  mockMessage({
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
  await testOnlyAPICall((router) =>
    router.channel_settings.upsertWithDeps({
      channel: toAOChannelWithServer(text_channel),
      flags: {
        mark_solution_enabled: true,
      },
    })
  );
  return {
    text_channel,
    default_author,
    text_channel_thread,
    guild,
    solution_message,
  };
}

describe("Checkmark Reaction Mark Solution", () => {
  it("should not mark a message as a solution if the emoji is not a checkmark", async () => {
    const { default_author, solution_message, text_channel_thread } =
      await setupSolvedMessageScenario("102860784329052160");
    const message_reaction = mockMessageReaction({
      message: solution_message,
      reacter: default_author.user,
      override: {
        emoji: {
          name: "🐈",
          id: null,
        },
      },
    });
    jest.spyOn(text_channel_thread, "send");
    await emitEvent(client, Events.MessageReactionAdd, message_reaction, default_author.user);
    expect(text_channel_thread.send).not.toHaveBeenCalled();
  });
  it("should not mark a message as a solution if the reaction is from the bot", async () => {
    const { default_author, solution_message, text_channel_thread } =
      await setupSolvedMessageScenario("102860784329052160");
    const message_reaction = mockMessageReaction({
      message: solution_message,
      reacter: default_author.user,
      override: {
        emoji: {
          name: "✅",
          id: null,
        },
        me: true,
      },
    });
    jest.spyOn(text_channel_thread, "send");
    await emitEvent(client, Events.MessageReactionAdd, message_reaction, client.user!);
    expect(text_channel_thread.send).not.toHaveBeenCalled();
  });
  it("should not mark a message as a solution if the guild is not allowed", async () => {
    const { default_author, solution_message, text_channel_thread } =
      await setupSolvedMessageScenario();
    const message_reaction = mockMessageReaction({
      message: solution_message,
      reacter: default_author.user,
      override: {
        emoji: {
          name: "✅",
          id: null,
        },
      },
    });
    jest.spyOn(text_channel_thread, "send");
    await emitEvent(client, Events.MessageReactionAdd, message_reaction, default_author.user);
    expect(text_channel_thread.send).not.toHaveBeenCalled();
  });
  it("should mark a message as a solution if the emoji is a checkmark, the reaction is not from the bot, and the guild is allowed", async () => {
    const { default_author, solution_message, text_channel_thread } =
      await setupSolvedMessageScenario("102860784329052160");
    const message_reaction = mockMessageReaction({
      message: solution_message,
      reacter: default_author.user,
      override: {
        emoji: {
          name: "✅",
          id: null,
        },
      },
    });
    jest.spyOn(text_channel_thread, "send");
    await emitEvent(client, Events.MessageReactionAdd, message_reaction, default_author.user);
    expect(text_channel_thread.send).toHaveBeenCalled();
  });
});
