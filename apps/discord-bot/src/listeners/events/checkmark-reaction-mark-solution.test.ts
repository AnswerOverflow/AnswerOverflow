import { Client, Events } from "discord.js";
import {
  emitEvent,
  mockGuild,
  mockGuildMember,
  mockMessage,
  mockMessageReaction,
  mockPublicThread,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { toAOChannel, toAOServer } from "~discord-bot/utils/conversions";
import { createChannel, upsertServer } from "@answeroverflow/db";

let client: Client;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
});

async function setupSolvedMessageScenario(guildId?: string) {
  const guild = mockGuild(client, undefined, {
    id: guildId,
  });
  const defaultAuthor = mockGuildMember({ client, guild });
  const textChannel = mockTextChannel(client, guild);
  const textChannelThread = mockPublicThread({
    client,
    parentChannel: textChannel,
  });
  mockMessage({
    client,
    channel: textChannel,
    author: defaultAuthor.user,
    override: {
      id: textChannelThread.id,
    },
  });
  const solutionMessage = mockMessage({
    client,
    channel: textChannelThread,
  });
  await upsertServer({
    create: toAOServer(guild),
  });
  await createChannel({
    ...toAOChannel(textChannel),
    flags: {
      markSolutionEnabled: true,
    },
  });
  return {
    textChannel,
    defaultAuthor,
    textChannelThread,
    guild,
    solutionMessage,
  };
}

describe("Checkmark Reaction Mark Solution", () => {
  it("should not mark a message as a solution if the emoji is not a checkmark", async () => {
    const { defaultAuthor, solutionMessage, textChannelThread } = await setupSolvedMessageScenario(
      "102860784329052160"
    );
    const messageReaction = mockMessageReaction({
      message: solutionMessage,
      reacter: defaultAuthor.user,
      override: {
        emoji: {
          name: "🐈",
          id: null,
        },
      },
    });
    const preEventTextChannelMessagesLength = textChannelThread.messages.cache.size;
    await emitEvent(client, Events.MessageReactionAdd, messageReaction, defaultAuthor.user);
    const postEventTextChannelMessagesLength = textChannelThread.messages.cache.size;
    expect(postEventTextChannelMessagesLength).toBe(preEventTextChannelMessagesLength);
  });
  it("should not mark a message as a solution if the reaction is from the bot", async () => {
    const { defaultAuthor, solutionMessage, textChannelThread } = await setupSolvedMessageScenario(
      "102860784329052160"
    );
    const messageReaction = mockMessageReaction({
      message: solutionMessage,
      reacter: defaultAuthor.user,
      override: {
        emoji: {
          name: "✅",
          id: null,
        },
        me: true,
      },
    });
    const preEventTextChannelMessagesLength = textChannelThread.messages.cache.size;
    await emitEvent(client, Events.MessageReactionAdd, messageReaction, client.user!);
    const postEventTextChannelMessagesLength = textChannelThread.messages.cache.size;
    expect(postEventTextChannelMessagesLength).toBe(preEventTextChannelMessagesLength);
  });
  it("should not mark a message as a solution if the guild is not allowed", async () => {
    const { defaultAuthor, solutionMessage, textChannelThread } =
      await setupSolvedMessageScenario();
    const messageReaction = mockMessageReaction({
      message: solutionMessage,
      reacter: defaultAuthor.user,
      override: {
        emoji: {
          name: "✅",
          id: null,
        },
      },
    });
    const preEventTextChannelMessagesLength = textChannelThread.messages.cache.size;
    await emitEvent(client, Events.MessageReactionAdd, messageReaction, defaultAuthor.user);
    const postEventTextChannelMessagesLength = textChannelThread.messages.cache.size;
    expect(postEventTextChannelMessagesLength).toBe(preEventTextChannelMessagesLength);
  });
  it("should mark a message as a solution if the emoji is a checkmark, the reaction is not from the bot, and the guild is allowed", async () => {
    const { defaultAuthor, solutionMessage, textChannelThread } = await setupSolvedMessageScenario(
      "102860784329052160"
    );
    const messageReaction = mockMessageReaction({
      message: solutionMessage,
      reacter: defaultAuthor.user,
      override: {
        emoji: {
          name: "✅",
          id: null,
        },
      },
    });
    jest.spyOn(textChannelThread, "send");
    await emitEvent(client, Events.MessageReactionAdd, messageReaction, defaultAuthor.user);
    expect(textChannelThread.send).toHaveBeenCalled();
  });
});
