import { ChannelType } from "discord.js";
import { mockForumChannel, mockMessage, mockTextChannel, mockThreadChannel } from "./channel-mock";
import { mockGuild } from "./guild-mock";
import { mockClient } from "./mock";

describe("Channel Mock", () => {
  it("should create a text channel", async () => {
    const client = mockClient();
    await client.login();
    const text_channel = mockTextChannel(client);
    expect(text_channel).toBeDefined();
    expect(client.channels.cache.get(text_channel.id)).toBeDefined();
    expect(client.guilds.cache.get(text_channel.guild.id)).toBeDefined();
    expect(text_channel.guild.channels.cache.get(text_channel.id)).toBeDefined();
    expect(text_channel.type).toBe(ChannelType.GuildText);
  });
  it("should create a forum channel", async () => {
    const client = mockClient();
    await client.login();
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
  it("should create a thread channel", async () => {
    const client = mockClient();
    await client.login();
    const thread_channel = mockThreadChannel(client);
    expect(thread_channel).toBeDefined();
    expect(client.channels.cache.get(thread_channel.id)).toBeDefined();
    expect(client.guilds.cache.get(thread_channel.guild.id)).toBeDefined();
    expect(thread_channel.guild.channels.cache.get(thread_channel.id)).toBeDefined();
    expect(thread_channel.type).toBe(ChannelType.PublicThread);
    expect(thread_channel.parent).toBeDefined();
    expect(thread_channel.parentId).toBeDefined();
  });
});

describe("Message Mock", () => {
  it("should create a message with no parameters", async () => {
    const client = mockClient();
    await client.login();
    const message = mockMessage(client);
    expect(message).toBeDefined();
    expect(message.channel).toBeDefined();
    expect(message.channel.messages.cache.get(message.id)).toBeDefined();
    expect(message.author).toBeDefined();
  });
  it("should create a message in a text channel", async () => {
    const client = mockClient();
    await client.login();
    const text_channel = mockTextChannel(client);
    const message = mockMessage(client, undefined, text_channel);
    expect(message).toBeDefined();
    expect(text_channel.messages.cache.get(message.id)).toBeDefined();
  });
  it("should create a message in a thread channel", async () => {
    const client = mockClient();
    await client.login();
    const thread_channel = mockThreadChannel(client);
    const message = mockMessage(client, undefined, thread_channel);
    expect(message).toBeDefined();
    expect(thread_channel.messages.cache.get(message.id)).toBeDefined();
  });
  it("should create a message in a forum thread channel", async () => {
    const client = mockClient();
    await client.login();
    const forum_channel = mockForumChannel(client);
    const fourm_thread = mockThreadChannel(client, undefined, forum_channel);
    const message = mockMessage(client, undefined, fourm_thread);
    expect(message).toBeDefined();
    expect(fourm_thread.messages.cache.get(message.id)).toBeDefined();
  });
  it("should have a guild member created for a new message in a guild channel", async () => {
    const client = mockClient();
    await client.login();
    const guild = mockGuild(client);
    const text_channel = mockTextChannel(client, guild);
    const message = mockMessage(client, undefined, text_channel);
    expect(message).toBeDefined();
    expect(message.guild).toBeDefined();
    expect(message.guild!.members.cache.get(message.author.id)).toBeDefined();
  });
});
