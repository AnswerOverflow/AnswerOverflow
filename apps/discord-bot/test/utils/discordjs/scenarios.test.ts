import { ChannelType, PermissionsBitField } from "discord.js";
import { createNormalScenario } from "./scenarios";

describe("Normal Scenario Tests", () => {
  it("should verify the client", async () => {
    const { client } = await createNormalScenario();
    expect(client).toBeDefined();
  });
  it("should verify the guild", async () => {
    const { guild } = await createNormalScenario();
    expect(guild).toBeDefined();
    expect(guild.channels.cache.size).toBe(3);
    expect(guild.members.cache.size).toBe(5);
  });
  it("should verify the guild owner", async () => {
    const { guild_member_owner, guild } = await createNormalScenario();
    expect(guild_member_owner).toBeDefined();
    expect(guild.ownerId).toBe(guild_member_owner.id);
    expect(guild_member_owner.permissions.bitfield).toBe(PermissionsBitField.All);
  });
  it("should verify the guild regular member", async () => {
    const { guild_member_default } = await createNormalScenario();
    expect(guild_member_default).toBeDefined();
    expect(guild_member_default.permissions.has(PermissionsBitField.Default)).toBeTruthy();
    expect(guild_member_default.permissions.has("ManageGuild")).toBe(false);
    expect(guild_member_default.permissions.has("Administrator")).toBe(false);
  });
  it("should verify the guild manager", async () => {
    const { guild_member_manage_guild } = await createNormalScenario();
    expect(guild_member_manage_guild).toBeDefined();
    expect(guild_member_manage_guild.permissions.has("ManageGuild")).toBe(true);
    expect(guild_member_manage_guild.permissions.has("Administrator")).toBe(false);
  });
  it("should verify the guild admin", async () => {
    const { guild_member_admin } = await createNormalScenario();
    expect(guild_member_admin).toBeDefined();
    expect(guild_member_admin.permissions.has("Administrator")).toBe(true);
    expect(guild_member_admin.permissions.has("ManageGuild")).toBe(true);
  });
  it("should verify the forum channel", async () => {
    const { forum_channel, guild } = await createNormalScenario();
    expect(forum_channel).toBeDefined();
    expect(forum_channel.type).toBe(ChannelType.GuildForum);
    expect(forum_channel.guildId).toBe(guild.id);
  });
  it("should verify the text channel", async () => {
    const { text_channel, guild } = await createNormalScenario();
    expect(text_channel).toBeDefined();
    expect(text_channel.type).toBe(ChannelType.GuildText);
    expect(text_channel.guildId).toBe(guild.id);
  });
  it("should verify all members are in the same guild", async () => {
    const {
      guild,
      guild_member_owner,
      guild_member_default,
      guild_member_manage_guild,
      guild_member_admin,
    } = await createNormalScenario();
    expect(guild_member_owner.guild.id).toBe(guild.id);
    expect(guild_member_default.guild.id).toBe(guild.id);
    expect(guild_member_manage_guild.guild.id).toBe(guild.id);
    expect(guild_member_admin.guild.id).toBe(guild.id);
  });
  it("should verify forum thread", async () => {
    const { forum_thread, forum_channel } = await createNormalScenario();
    expect(forum_thread).toBeDefined();
    expect(forum_thread.parentId).toBe(forum_channel.id);
  });
  it("should verify forum thread message", async () => {
    const { forum_thread_message_from_default, forum_thread, guild_member_default } =
      await createNormalScenario();
    expect(forum_thread_message_from_default).toBeDefined();
    expect(forum_thread_message_from_default.channel).toEqual(forum_thread);
    expect(forum_thread_message_from_default.author.id).toEqual(guild_member_default.id);
    expect(forum_thread_message_from_default.guildId).toEqual(guild_member_default.guild.id);
  });
  it("should verify text channel message", async () => {
    const { text_channel_message_from_default, text_channel, guild_member_default } =
      await createNormalScenario();
    expect(text_channel_message_from_default).toBeDefined();
    expect(text_channel_message_from_default.channel).toEqual(text_channel);
    expect(text_channel_message_from_default.author.id).toEqual(guild_member_default.id);
    expect(text_channel_message_from_default.guildId).toEqual(guild_member_default.guild.id);
  });
});
