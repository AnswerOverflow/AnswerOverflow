import type { Client, TextChannel } from "discord.js";
import {
  extractThreadsSetFromMessages,
  extractUsersSetFromMessages,
  messagesToAOMessagesSet,
} from "./conversions";
import {
  mockTextChannel,
  mockMessages,
  mockUser,
  mockMessage,
  mockThreadFromParentMessage,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";

let text_channel: TextChannel;
let client: Client;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  text_channel = mockTextChannel(client);
});

describe("Extract Users Set From Messages", () => {
  it("should extract users from messages", () => {
    const messages = mockMessages(text_channel, 10);
    const users = extractUsersSetFromMessages(messages);
    expect(users.length).toBe(10);
  });
  it("should not extract duplicate users", () => {
    const author = mockUser(client);
    const msg1 = mockMessage({
      client,
      author,
    });
    const msg2 = mockMessage({
      client,
      author,
    });
    const users = extractUsersSetFromMessages([msg1, msg2]);
    expect(users.length).toBe(1);
  });
});

describe("Extract Threads Set From Messages", () => {
  it("should extract threads from messages", () => {
    const msg_with_thread = mockMessage({ client });
    const msg_without_thread = mockMessage({ client });
    mockThreadFromParentMessage({
      client,
      parent_message: msg_with_thread,
    });
    const threads = extractThreadsSetFromMessages([msg_with_thread, msg_without_thread]);
    expect(threads.length).toBe(1);
  });
  it("should not extract duplicate threads", () => {
    const msg_with_thread = mockMessage({ client });
    mockThreadFromParentMessage({
      client,
      parent_message: msg_with_thread,
    });
    const threads = extractThreadsSetFromMessages([msg_with_thread, msg_with_thread]);
    expect(threads.length).toBe(1);
  });
});
describe("Messages To AO Messages Set", () => {
  it("should convert messages to AO messages", () => {
    const messages = mockMessages(text_channel, 10);
    const ao_messages = messagesToAOMessagesSet(messages);
    expect(ao_messages.length).toBe(10);
  });
  it("should not convert duplicate messages", () => {
    const msg1 = mockMessage({ client });
    const ao_messages = messagesToAOMessagesSet([msg1, msg1]);
    expect(ao_messages.length).toBe(1);
  });
});
