import { Client, Events, TextChannel } from "discord.js";
import {
  mockTextChannel,
  mockMessage,
  mockGuildMember,
  emitEvent,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { randomSnowflake } from "@answeroverflow/discordjs-utils";
import { mockPublicThread } from "@answeroverflow/discordjs-mock";
import { createChannel, createServer } from "@answeroverflow/db";
import { toAOServer, toAOChannel } from "~discord-bot/utils/conversions";

let client: Client;
let textChannel: TextChannel;

beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  textChannel = mockTextChannel(client);
});

const mockMessageCorrect = async () => {
  // Channel with flag enabled
  await createServer(toAOServer(textChannel.guild));
  await createChannel({
    ...toAOChannel(textChannel),
    flags: { sendMarkSolutionInstructionsInNewThreads: true },
  });
  const author = mockGuildMember({ client });
  const message = mockMessage({
    client,
    channel: textChannel,
    author: author.user,
    override: {
      content: "Message",
    },
  });

  await emitEvent(client, Events.MessageCreate, message);

  expect(message.startThread).toHaveBeenCalled();
};

describe("Auto thread", () => {
  it("should not create a thread on a channel thread channel", async () => {
    await mockMessageCorrect();

    const channel = mockPublicThread({ client });
    const author = mockGuildMember({ client });
    const message = mockMessage({
      client,
      channel: channel,
      override: {
        content: "Hey",
      },
      author: author.user,
    });

    await emitEvent(client, Events.MessageCreate, message);

    expect(message.startThread).not.toHaveBeenCalled();
  });
  it("should not create a thread if the author is a bot", async () => {
    await mockMessageCorrect();
    const author = mockGuildMember({
      client,
      data: {
        user: {
          bot: true,
          id: randomSnowflake().toString(),
        },
      },
    });

    const message = mockMessage({
      client,
      channel: textChannel,
      override: {
        content: "Hey",
      },
      author: author.user,
    });

    await emitEvent(client, Events.MessageCreate, message);

    // assert
    expect(message.startThread).not.toHaveBeenCalled();
  });
  it("should not create if the author is the system", async () => {
    await mockMessageCorrect();

    const author = mockGuildMember({
      client,
      data: {
        user: {
          system: true,
          id: randomSnowflake().toString(),
        },
      },
    });

    const message = mockMessage({
      client,
      channel: textChannel,
      override: {
        content: "Hey",
      },
      author: author.user,
    });

    await emitEvent(client, Events.MessageCreate, message);

    // assert
    expect(message.startThread).not.toHaveBeenCalled();
  });
  it("should not create a thread if it does not have auto thread enabled", async () => {
    await mockMessageCorrect();

    const channel = mockTextChannel(client);

    await createServer(toAOServer(channel.guild));
    await createChannel({
      ...toAOChannel(channel),
      flags: { sendMarkSolutionInstructionsInNewThreads: false },
    });
    const author = mockGuildMember({ client });

    const message = mockMessage({
      client,
      channel: channel,
      override: {
        content: "Hey",
      },
      author: author.user,
    });

    await emitEvent(client, Events.MessageCreate, message);

    expect(message.startThread).not.toHaveBeenCalled();
  });

  it("should create a thread", async () => {
    await mockMessageCorrect();
  });
});
