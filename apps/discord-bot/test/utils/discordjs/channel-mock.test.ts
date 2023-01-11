import { ChannelType, Client } from "discord.js";
import {
  mockForumChannel,
  mockMessage,
  mockTextChannel,
  mockPublicThread,
  mockThreadFromParentMessage,
} from "./channel-mock";
import { mockGuild } from "./guild-mock";
import { setupBot } from "./scenarios";

let client: Client;
beforeEach(async () => {
  const data = await setupBot();
  client = data.client;
});

describe("Text Channel Mock", () => {
  it("should create a text channel", () => {
    const text_channel = mockTextChannel(client);
    expect(text_channel).toBeDefined();
    expect(client.channels.cache.get(text_channel.id)).toBeDefined();
    expect(client.guilds.cache.get(text_channel.guild.id)).toBeDefined();
    expect(text_channel.guild.channels.cache.get(text_channel.id)).toBeDefined();
    expect(text_channel.type).toBe(ChannelType.GuildText);
  });
  test.todo("fetch archived threads");
  test.todo("fetch active threads");
});

describe("Forum Channel Mock", () => {
  it("should create a forum channel", () => {
    const forum_channel = mockForumChannel(client);
    expect(forum_channel).toBeDefined();
    expect(client.channels.cache.get(forum_channel.id)).toBeDefined();
    expect(client.guilds.cache.get(forum_channel.guild.id)).toBeDefined();
    expect(forum_channel.guild.channels.cache.get(forum_channel.id)).toBeDefined();
    expect(forum_channel.type).toBe(ChannelType.GuildForum);
    expect(forum_channel.availableTags).toBeDefined();
    expect(forum_channel.availableTags.length).toBe(1);
    expect(forum_channel.availableTags[0].name).toBe("test tag");
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
    const text_channel = mockTextChannel(client);
    const message = mockMessage({ client, channel: text_channel });
    expect(message).toBeDefined();
    expect(text_channel.messages.cache.get(message.id)).toBeDefined();
  });
  it("should create a message in a thread channel", () => {
    const thread_channel = mockPublicThread({ client });
    const message = mockMessage({ client, channel: thread_channel });
    expect(message).toBeDefined();
    expect(thread_channel.messages.cache.get(message.id)).toBeDefined();
  });
  it("should create a message in a forum thread channel", () => {
    const forum_channel = mockForumChannel(client);
    const fourm_thread = mockPublicThread({ client, parent_channel: forum_channel });
    const message = mockMessage({ client, channel: fourm_thread });
    expect(message).toBeDefined();
    expect(fourm_thread.messages.cache.get(message.id)).toBeDefined();
  });
  it("should have a guild member created for a new message in a guild channel", () => {
    const guild = mockGuild(client);
    const text_channel = mockTextChannel(client, guild);
    const message = mockMessage({ client, channel: text_channel });
    expect(message).toBeDefined();
    expect(message.guild).toBeDefined();
    expect(message.guild!.members.cache.get(message.author.id)).toBeDefined();
  });
});

describe("Thread Mock", () => {
  it("should create a thread channel", () => {
    const thread_channel = mockPublicThread({ client });
    expect(thread_channel).toBeDefined();
    expect(client.channels.cache.get(thread_channel.id)).toBeDefined();
    expect(client.guilds.cache.get(thread_channel.guild.id)).toBeDefined();
    expect(thread_channel.guild.channels.cache.get(thread_channel.id)).toBeDefined();
    expect(thread_channel.type).toBe(ChannelType.PublicThread);
    expect(thread_channel.parent).toBeDefined();
    expect(thread_channel.parentId).toBeDefined();
  });
  it("should create a thread channel with a parent channel", () => {
    const text_channel = mockTextChannel(client);
    const thread_channel = mockPublicThread({ client, parent_channel: text_channel });
    expect(thread_channel.parent).not.toBeNull();
    expect(thread_channel.parent!.id).toBe(text_channel.id);
  });
  it("should create a thread with a parent message", () => {
    const text_channel = mockTextChannel(client);
    const thread_parent = mockMessage({ client, channel: text_channel });
    const thread_channel = mockThreadFromParentMessage({ client, parent_message: thread_parent });
    expect(thread_channel.parent).not.toBeNull();
    expect(thread_channel.id).toBe(thread_parent.id);
    expect(thread_parent.thread!.id).toBe(thread_channel.id);
  });
});
