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
    expect(guild.channels.cache.size).toBe(2);
    expect(guild.members.cache.size).toBe(4);
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
});
