// TODO: Write tests that validate each phase of the Sapphire input parsing to easily debug where mocked data fails

import { ChannelType, Events } from "discord.js";
import {
  mockClient,
  mockGuild,
  mockGuildChannel,
  mockGuildMember,
  mockMessage,
  mockSlashCommand,
  mockUser,
} from "./mock";

describe("Mock tests", () => {
  it("should create a mocked user", async () => {
    const bot = mockClient();
    await bot.login();
    const user1 = mockUser(bot);
    expect(bot.users.cache.get(user1.id)).toBeDefined();
    mockUser(bot, { id: "101" });
    expect(bot.users.cache.get("101")).toBeDefined();
    expect(bot.users.cache.get("102")).not.toBeDefined();
  });
  it("should create a mocked guild", async () => {
    const bot = mockClient();
    await bot.login();
    const user = mockUser(bot);
    const guild1 = mockGuild(bot, user);
    expect(bot.guilds.cache.get(guild1.id)).toBeDefined();
    expect(bot.users.cache.get(guild1.ownerId)).toBeDefined();

    const user2 = mockUser(bot, { id: "200" });
    const guild2 = mockGuild(bot, user2, { id: "200" });
    expect(guild2.ownerId).toBe("200");
    expect(bot.users.cache.get(guild2.ownerId)).toBeDefined();
  });
  it("should create a mocked guild channel", async () => {
    const bot = mockClient();
    await bot.login();
    const user = mockUser(bot);
    const guild = mockGuild(bot, user);
    mockGuildMember(bot, guild);

    const text_channel = mockGuildChannel(bot, guild, ChannelType.GuildText);
    expect(text_channel).toBeDefined();
    expect(text_channel.guild).toBeDefined();
    expect(text_channel.guildId).toBe(guild.id);
    expect(text_channel.type).toBe(ChannelType.GuildText);
    expect(guild.channels.cache.get(text_channel.id)).toBeDefined();
    expect(bot.channels.cache.get(text_channel.id)).toBeDefined();

    expect(guild.members.cache.get(user.id)).toBeDefined();
    await expect(text_channel.guild.members.fetch(user.id)).resolves.toBeDefined();

    const voice_channel = mockGuildChannel(bot, guild, ChannelType.GuildVoice);
    expect(voice_channel).toBeDefined();
    expect(voice_channel.guild).toBeDefined();
    expect(voice_channel.guildId).toBe(guild.id);
    expect(voice_channel.type).toBe(ChannelType.GuildVoice);
    expect(guild.channels.cache.get(voice_channel.id)).toBeDefined();
    expect(bot.channels.cache.get(voice_channel.id)).toBeDefined();
  });
  it("should create a mocked guild member", async () => {
    const bot = mockClient();
    await bot.login();
    const user = mockUser(bot);
    const guild = mockGuild(bot, user);
    const member = guild.members.cache.get(user.id);
    expect(member).toBeDefined();
    const created_member = mockGuildMember(bot, guild);
    expect(created_member).toBeDefined();
    expect(guild.members.cache.get(created_member.id)).toBeDefined();
    expect(guild.members.cache.get(user.id)).toBeDefined();
    const new_created_member = mockGuildMember(bot, guild, {
      user: {
        id: "2435234",
        username: "USERNAME",
        avatar: "user avatar url",
        discriminator: "user#0000",
      },
    });
    expect(new_created_member).toBeDefined();
    expect(guild.members.cache.get(new_created_member.id)).toBeDefined();
    expect(bot.users.cache.get(new_created_member.id)).toBeDefined();
  });
  it("should create a mocked message", async () => {
    const bot = mockClient();
    await bot.login();
    const user = mockUser(bot);
    const guild = mockGuild(bot, user);
    const text_channel = mockGuildChannel(bot, guild, ChannelType.GuildText);
    const message = mockMessage(bot, text_channel);
    expect(message).toBeDefined();
    expect(message.author).toBeDefined();
    expect(message.channel).toBeDefined();
    expect(message.channel.type).toBe(ChannelType.GuildText);
    const forum_channel = mockGuildChannel(bot, guild, ChannelType.GuildForum);
    const forum_message = mockMessage(bot, forum_channel);
    expect(forum_message).toBeDefined();
    expect(forum_message.author).toBeDefined();
    expect(forum_message.channel.type).toBe(ChannelType.GuildForum);
  });
  it("should create a mocked interaction", async () => {
    const bot = mockClient();
    await bot.login("test");

    const user = mockUser(bot, {
      id: "1000",
    });
    const guild = mockGuild(bot, user);
    const text_channel = mockGuildChannel(bot, guild, ChannelType.GuildText);

    const slash_command = mockSlashCommand({
      client: bot,
      guild,
      channel: text_channel,
      permissions: ["ManageGuild"],
      user: {
        id: "235234",
      },
      data: {
        id: "123",
        name: "test",
      },
    });
    const member = await text_channel.guild.members.fetch(slash_command.user.id);
    expect(member).toBeDefined();
    expect(slash_command.guild).toBeDefined();

    const owner = await slash_command.guild!.members.fetch(slash_command.guild!.ownerId);
    expect(owner).toBeDefined();
    expect(owner.permissions.has("ManageGuild")).toBe(true);

    const everyone = guild.roles.everyone;
    expect(guild.roles.cache.get(guild.id)).toBeDefined();
    expect(everyone).toBeDefined();
    expect(everyone.id).toBeDefined();

    expect(member.user.id).toBeDefined();
    expect(member.guild.ownerId).toBeDefined();
    expect(member.roles).toBeDefined();
    expect(member.permissions.has("ManageGuild")).toBeTruthy();
    expect(slash_command.memberPermissions!.has("ManageGuild")).toBeTruthy();

    expect(guild.members.cache.get(slash_command.user.id)).toBeDefined();

    expect(bot.users.cache.get(slash_command.user.id)).toBeDefined();

    let has_run = false;
    bot.addListener(Events.InteractionCreate, (interaction) => {
      expect(interaction).toBeDefined();
      has_run = true;
    });

    bot.emit(Events.InteractionCreate, slash_command);
    expect(has_run).toBe(true);
  });
});
