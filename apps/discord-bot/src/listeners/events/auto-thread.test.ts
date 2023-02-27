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

let client: Client;
let textChannel: TextChannel;

beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  textChannel = mockTextChannel(client);
});

describe("Auto thread", () => {
  it("should not create a thread on a channel thread channel", async () => {
    const channel = mockPublicThread({ client });
    const author = mockGuildMember({ client });
    const message = mockMessage({
      client,
      channel,
      author: author.user,
    });

    await emitEvent(client, Events.MessageCreate, message);

    expect(message.startThread).not.toHaveBeenCalled();
  });
  it("should not create a thread if the author is a bot", async () => {
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
      author: author.user,
    });

    await emitEvent(client, Events.MessageCreate, message);

    // assert
    expect(message.startThread).not.toHaveBeenCalled();
  });
  it("should not create if the author is the system", async () => {
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
      author: author.user,
    });

    await emitEvent(client, Events.MessageCreate, message);

    // assert
    expect(message.startThread).not.toHaveBeenCalled();
  });
  it("should not create a thread if it does not have auto thread enabled", () => {});

  it("should create a thread", async () => {
    // Channel with flag enabled
    const channel = mockTextChannel(client);
    const author = mockGuildMember({ client });
    const message = mockMessage({
      client,
      channel: channel,
      author: author.user,
    });

    // Mock channel flag from db

    await emitEvent(client, Events.MessageCreate, message);

    expect(message.startThread).toHaveBeenCalled();
  });
});
