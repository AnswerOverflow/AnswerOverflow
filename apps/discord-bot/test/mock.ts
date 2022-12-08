import { SapphireClient } from "@sapphire/framework";
import { Channel } from "diagnostics_channel";
import {
  User,
  Message,
  GuildMember,
  Guild,
  TextChannel,
  GuildChannel,
  Client,
  ChatInputCommandInteraction,
  PermissionsBitField,
  ChannelType,
} from "discord.js";
import type {
  RawChannelData,
  RawGuildChannelData,
  RawGuildData,
  RawGuildMemberData,
  RawInteractionData,
  RawMessageData,
  RawUserData,
} from "discord.js/typings/rawDataTypes";
// References: https://dev.to/heymarkkop/how-to-implement-test-and-mock-discordjs-v13-slash-commands-with-typescript-22lc
// Needs extension, just getting the concepts in for testing

export function mockClient() {
  const client = new SapphireClient({ intents: [] });
  Client.prototype.login = vitest.fn();
  return client;
}

export function mockInteracion(
  client: SapphireClient,
  command: RawInteractionData
): ChatInputCommandInteraction {
  return Reflect.construct(ChatInputCommandInteraction, [
    client,
    command,
  ]) as ChatInputCommandInteraction;
}

export function mockUser(client: SapphireClient) {
  return Reflect.construct(User, [
    client,
    {
      id: "100",
      username: "USERNAME",
      discriminator: "user#0000",
      avatar: "user avatar url",
      avatarUrl: () => "user avatar url",
      bot: false,
    } as RawUserData,
  ]) as User;
}

export function mockGuild(client: SapphireClient) {
  return Reflect.construct(Guild, [
    client,
    {
      unavailable: false,
      id: "400",
      name: "mocked js guild",
      icon: "mocked guild icon url",
      splash: "mocked guild splash url",
      region: "eu-west",
      member_count: 42,
      large: false,
      features: [],
      application_id: "application-id",
      afkTimeout: 1000,
      afk_channel_id: "afk-channel-id",
      system_channel_id: "system-channel-id",
      embed_enabled: true,
      verification_level: 2,
      explicit_content_filter: 3,
      mfa_level: 8,
      joined_at: new Date("2018-01-01").getTime(),
      owner_id: "100", // owner id has to have been created
      channels: [],
      roles: [],
      presences: [],
      voice_states: [],
      emojis: [],
    } as RawGuildData,
  ]) as Guild;
}

export function mockChannel(client: SapphireClient) {
  return Reflect.construct(Channel, [
    client,
    {
      id: "900",
    } as RawChannelData,
  ]) as Channel;
}

export function mockGuildChannel(guild: Guild) {
  return Reflect.construct(GuildChannel, [
    guild,
    {
      id: "900",
      permissions: [],
      type: ChannelType.GuildText,
      name: "guild-channel",
      position: 1,
      parent_id: "123456789",
      permission_overwrites: [],
      guild_id: "400",
      applied_tags: [],
      available_tags: [],
      default_reaction_emoji: [],
      default_sort_order: 1,
    } as RawGuildChannelData,
  ]) as GuildChannel;
}

export function mockTextChannel(guild: Guild) {
  return Reflect.construct(TextChannel, [
    guild,
    {
      id: "900",
      permissions: [],
      type: ChannelType.GuildText,
      name: "guild-channel",
      position: 1,
      parent_id: "123456789",
      permission_overwrites: [],
      guild_id: "400",
      applied_tags: [],
      available_tags: [],
      default_reaction_emoji: [],
      default_sort_order: 1,
      topic: "topic",
      nsfw: false,
      last_message_id: "123456789",
      lastPinTimestamp: new Date("2019-01-01").getTime(),
      rate_limit_per_user: 0,
    } as RawGuildChannelData,
  ]) as TextChannel;
}

export function mockGuildMember(client: SapphireClient, guild: Guild) {
  return Reflect.construct(GuildMember, [
    client,
    {
      id: BigInt(1),
      deaf: false,
      mute: false,
      self_mute: false,
      self_deaf: false,
      session_id: "session-id",
      channel_id: "900",
      nick: "nick",
      joined_at: new Date("2020-01-01").getTime(),
      user: {
        id: "100",
        username: "USERNAME",
      },
      guild_id: "400",
      roles: [],
      permissions: PermissionsBitField.resolve("ManageGuild"),
    } as RawGuildMemberData,
    guild,
  ]) as GuildMember;
}

export function mockMessage(client: SapphireClient, textChannel: TextChannel, content: string) {
  return Reflect.construct(Message, [
    client,
    {
      id: "123456789",
      attachments: [],
      author: {
        id: "100",
        username: "USERNAME",
        avatar: "user avatar url",
        discriminator: "user#0000",
      },
      channel_id: "900",
      content: content,
      edited_timestamp: null,
      embeds: [],
      guild_id: "400",
      mention_everyone: false,
      mention_roles: [],
      mentions: [],
      pinned: false,
      timestamp: "33",
      tts: false,
      type: 0,
    } as RawMessageData,
    textChannel,
  ]) as Message;
}
