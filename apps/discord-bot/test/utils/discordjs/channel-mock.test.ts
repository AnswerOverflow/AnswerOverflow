import { ChannelType } from "discord.js";
import { mockForumChannel, mockTextChannel } from "./channel-mock";
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
  it("should create a forum channe", async () => {
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
});
