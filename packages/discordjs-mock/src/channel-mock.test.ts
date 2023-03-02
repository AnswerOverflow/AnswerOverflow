import { ChannelType, Client } from "discord.js";
import {
  mockTextChannel,
  mockForumChannel,
  mockMessage,
  mockPublicThread,
  mockThreadFromParentMessage,
} from "./channel-mock";
import { setupBot } from "./client-mock";
import { mockGuild } from "./guild-mock";
let client: Client;
beforeEach(async () => {
  client = await setupBot();
});

describe("Text Channel Mock", () => {
  it("should create a text channel", () => {
    const textChannel = mockTextChannel(client);
    expect(textChannel).toBeDefined();
    expect(client.channels.cache.get(textChannel.id)).toBeDefined();
    expect(client.guilds.cache.get(textChannel.guild.id)).toBeDefined();
    expect(textChannel.guild.channels.cache.get(textChannel.id)).toBeDefined();
    expect(textChannel.type).toBe(ChannelType.GuildText);
  });
  test.todo("fetch archived threads");
  test.todo("fetch active threads");
});

describe("Forum Channel Mock", () => {
  it("should create a forum channel", () => {
    const forumChannel = mockForumChannel(client);
    expect(forumChannel).toBeDefined();
    expect(client.channels.cache.get(forumChannel.id)).toBeDefined();
    expect(client.guilds.cache.get(forumChannel.guild.id)).toBeDefined();
    expect(forumChannel.guild.channels.cache.get(forumChannel.id)).toBeDefined();
    expect(forumChannel.type).toBe(ChannelType.GuildForum);
    expect(forumChannel.availableTags).toBeDefined();
    expect(forumChannel.availableTags.length).toBe(1);
    expect(forumChannel.availableTags[0]!.name).toBe("test tag");
  });
  test.todo("fetch archived threads");
  test.todo("fetch active threads");
});

describe("Message Mock", () => {
  it("should create a message with no parameters", () => {
    const message = mockMessage({ client });
    expect(message).toBeDefined();
    expect(message.channel).toBeDefined();
    expect(message.channel.messages.cache.get(message.id)).toBeDefined();
    expect(message.author).toBeDefined();
  });
  it("should create a message in a text channel", () => {
    const textChannel = mockTextChannel(client);
    const message = mockMessage({ client, channel: textChannel });
    expect(message).toBeDefined();
    expect(textChannel.messages.cache.get(message.id)).toBeDefined();
  });
  it("should create a message in a thread channel", () => {
    const threadChannel = mockPublicThread({ client });
    const message = mockMessage({ client, channel: threadChannel });
    expect(message).toBeDefined();
    expect(threadChannel.messages.cache.get(message.id)).toBeDefined();
  });
  it("should create a message in a forum thread channel", () => {
    const forumChannel = mockForumChannel(client);
    const fourmThread = mockPublicThread({ client, parentChannel: forumChannel });
    const message = mockMessage({ client, channel: fourmThread });
    expect(message).toBeDefined();
    expect(fourmThread.messages.cache.get(message.id)).toBeDefined();
  });
  it("should have a guild member created for a new message in a guild channel", () => {
    const guild = mockGuild(client);
    const textChannel = mockTextChannel(client, guild);
    const message = mockMessage({ client, channel: textChannel });
    expect(message).toBeDefined();
    expect(message.guild).toBeDefined();
    expect(message.guild!.members.cache.get(message.author.id)).toBeDefined();
  });
  it("should start a thread from a message", async () => {
    const textChannel = mockTextChannel(client);
    const message = mockMessage({ client, channel: textChannel });
    const thread = await message.startThread({ name: "test thread" });
    expect(thread).toBeDefined();
    expect(thread.parentId).toBe(message.channel.id);
    expect(thread.parent).toBeDefined();
    expect(thread.name).toBe("test thread");
    expect(thread.parent!.id).toBe(message.channel.id);
    expect(message.thread).toBeDefined();
    expect(message.thread!.id).toBe(thread.id);
    const fromCache = textChannel.threads.cache.get(thread.id);
    expect(fromCache).toBeDefined();
    expect(fromCache!.id).toBe(thread.id);
    expect(fromCache!.name).toBe(thread.name);
  });
});

describe("Thread Mock", () => {
  it("should create a thread channel", () => {
    const threadChannel = mockPublicThread({ client });
    expect(threadChannel).toBeDefined();
    expect(client.channels.cache.get(threadChannel.id)).toBeDefined();
    expect(client.guilds.cache.get(threadChannel.guild.id)).toBeDefined();
    expect(threadChannel.guild.channels.cache.get(threadChannel.id)).toBeDefined();
    expect(threadChannel.type).toBe(ChannelType.PublicThread);
    expect(threadChannel.parent).toBeDefined();
    expect(threadChannel.parentId).toBeDefined();
  });
  it("should create a thread channel with a parent channel", () => {
    const textChannel = mockTextChannel(client);
    const threadChannel = mockPublicThread({ client, parentChannel: textChannel });
    expect(threadChannel.parent).not.toBeNull();
    expect(threadChannel.parent!.id).toBe(textChannel.id);
  });
  it("should create a thread with a parent message", () => {
    const textChannel = mockTextChannel(client);
    const threadParent = mockMessage({ client, channel: textChannel });
    const threadChannel = mockThreadFromParentMessage({ client, parentMessage: threadParent });
    expect(threadChannel.parent).not.toBeNull();
    expect(threadChannel.id).toBe(threadParent.id);
    expect(threadParent.thread!.id).toBe(threadChannel.id);
  });
});
