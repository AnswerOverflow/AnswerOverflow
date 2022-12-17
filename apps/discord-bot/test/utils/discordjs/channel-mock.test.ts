import { ChannelType } from "discord.js";
import { mockForumChannel, mockTextChannel, mockThreadChannel } from "./channel-mock";
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
    expect(forum_channel.availableTags.length).toBe(0);
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
