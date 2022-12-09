import { SapphireClient } from "@sapphire/framework";
import {
  User,
  Message,
  GuildMember,
  Guild,
  TextChannel,
  Client,
  ChatInputCommandInteraction,
  ChannelType,
  APIGuild,
  APIGuildChannel,
  APIInteractionGuildMember,
  ApplicationCommandType,
  InteractionType,
  GuildChannel,
  APIApplicationCommandInteraction,
  APIChatInputApplicationCommandInteractionData,
  PermissionsBitField,
  PermissionResolvable,
  APIUser,
  Role,
} from "discord.js";
import type {
  RawInteractionData,
  RawMessageData,
  RawRoleData,
  RawUserData,
} from "discord.js/typings/rawDataTypes";
// References: https://dev.to/heymarkkop/how-to-implement-test-and-mock-discordjs-v13-slash-commands-with-typescript-22lc

export function mockClient() {
  const client = new SapphireClient({ intents: [] });
  Client.prototype.login = vitest.fn();
  return client;
}

export function getMockUserData(data: Partial<RawUserData> = {}): RawUserData {
  return {
    id: "100",
    username: "USERNAME",
    discriminator: "user#0000",
    avatar: "user avatar url",
    bot: false,
    ...data,
  } as RawUserData;
}

export function mockUser(client: SapphireClient, data: Partial<RawUserData> = {}) {
  const user = Reflect.construct(User, [client, getMockUserData(data)]) as User;
  client.users.cache.set(user.id, user);
  return user;
}

export function getMockGuildData(data: Partial<APIGuild> = {}): APIGuild {
  return {
    id: "400",
    verification_level: 0,
    emojis: [],
    icon: "guild icon url",
    mfa_level: 0,
    hub_type: 0,
    features: [],
    roles: [
      {
        color: 0,
        hoist: false,
        id: data.id ?? "400",
        managed: false,
        mentionable: false,
        name: "everyone",
        permissions: PermissionsBitField.Default.toString(),
        position: 0,
        tags: undefined,
      } as RawRoleData,
    ],
    name: "guild name",
    description: "guild description",
    default_message_notifications: 0,
    banner: "guild banner url",
    splash: "guild splash url",
    discovery_splash: "guild discovery splash url",
    ...data,
  } as APIGuild;
}

export function mockGuild(
  client: SapphireClient,
  owner: User,
  data: Partial<Omit<APIGuild, "owner_id">> = {}
) {
  const guild = Reflect.construct(Guild, [
    client,
    getMockGuildData({ ...data, owner_id: owner.id }),
  ]) as Guild;
  client.guilds.cache.set(guild.id, guild);
  mockGuildMember(client, guild, {
    user: {
      id: owner.id,
      avatar: owner.avatar,
      username: owner.username,
      discriminator: owner.discriminator,
    },
  });
  // replace guild members fetched with accessing from the cache of the fetched user id in the fetch argument
  guild.members.fetch = vitest.fn().mockImplementation((id: string) => {
    const member = guild.members.cache.get(id);
    if (member) return Promise.resolve(member);
    return Promise.reject(new Error("Member not found"));
  });
  return guild;
}

export function getMockGuildChannelData<T extends ChannelType>(data: Partial<APIGuildChannel<T>>) {
  return {
    id: "900",
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
    rate_limit_per_user: 0,
    ...data,
  } as APIGuildChannel<T>;
}

export function mockGuildChannel<T extends ChannelType>(
  client: SapphireClient,
  guild: Guild,
  type: T,
  data: Partial<Omit<APIGuildChannel<T>, "type">> = {}
) {
  const channel = Reflect.construct(TextChannel, [
    guild,
    getMockGuildChannelData({ ...data, type, guild_id: guild.id }),
  ]) as TextChannel;
  client.channels.cache.set(channel.id, channel);
  guild.channels.cache.set(channel.id, channel);
  return channel;
}

export function getMockInteractionGuildMember(data: Partial<APIInteractionGuildMember>) {
  return {
    user: getMockUserData(),
    permissions: "0",
    roles: [],
    deaf: false,
    joined_at: "33",
    mute: false,
    ...data,
  } as APIInteractionGuildMember;
}

export function mockGuildMember(
  client: SapphireClient,
  guild: Guild,
  data: Partial<APIInteractionGuildMember> = {}
) {
  const member = Reflect.construct(GuildMember, [
    client,
    getMockInteractionGuildMember(data),
    guild,
  ]) as GuildMember;
  guild.members.cache.set(member.id, member);
  return member;
}

export function getMockMessageData(data: Partial<RawMessageData> = {}) {
  return {
    id: "123456789",
    attachments: [],
    author: getMockUserData(),
    content: "",
    edited_timestamp: null,
    embeds: [],
    mention_everyone: false,
    mention_roles: [],
    mentions: [],
    pinned: false,
    tts: false,
    type: 0,
    ...data,
  } as RawMessageData;
}

export function mockMessage(
  client: SapphireClient,
  textChannel: TextChannel,
  data: Partial<RawMessageData> = {}
) {
  return Reflect.construct(Message, [
    client,
    getMockMessageData({ ...data, channel_id: textChannel.id }),
    textChannel,
  ]) as Message;
}

export function getMockInteractionData(
  guild: Guild,
  channel: GuildChannel,
  name: string,
  id: string,
  data: Partial<RawInteractionData> = {}
) {
  return {
    guild_id: guild.id,
    application_id: "123456789",
    channel_id: channel.id,
    data: {
      id: id,
      name: name,
      type: ApplicationCommandType.ChatInput,
    },
    type: InteractionType.ApplicationCommand,
    version: 1,
    member: getMockInteractionGuildMember({}),
    ...data,
  } as RawInteractionData;
}

export function mockInteracion(
  client: SapphireClient,
  guild: Guild,
  channel: GuildChannel,
  name: string,
  id: string,
  data: Partial<RawInteractionData> = {}
): ChatInputCommandInteraction {
  return Reflect.construct(ChatInputCommandInteraction, [
    client,
    getMockInteractionData(guild, channel, name, id, data),
  ]) as ChatInputCommandInteraction;
}

export function mockSlashCommand(options: {
  client: SapphireClient;
  guild: Guild;
  channel: GuildChannel;
  data: Partial<Omit<APIChatInputApplicationCommandInteractionData, "guild_id" | "type">> &
    Pick<APIChatInputApplicationCommandInteractionData, "name" | "id">;
  permissions: PermissionResolvable;
  user?: Partial<APIUser>;
}): ChatInputCommandInteraction {
  const { client, guild, channel, user, data, permissions } = options;
  const role = mockRole({
    client,
    permissions,
    guild,
  }); // Create a custom role representing the permissions of the slash command user

  const cmd_data: APIApplicationCommandInteraction = {
    application_id: "123456789",
    channel_id: channel.id,
    data: {
      ...data,
      guild_id: guild.id,
      type: ApplicationCommandType.ChatInput,
    },
    id: data.id,
    guild_id: guild.id,
    member: {
      deaf: false,
      joined_at: "33",
      mute: false,
      permissions: PermissionsBitField.resolve(permissions).toString(),
      roles: [role.id, guild.id],
      user: {
        id: "123456789",
        username: "test",
        avatar: "123456789",
        discriminator: "1234",
        ...user,
      },
    },
    locale: "en-US",
    token: "123456789",
    type: InteractionType.ApplicationCommand,
    version: 1,
  };
  const cmd = Reflect.construct(ChatInputCommandInteraction, [
    client,
    cmd_data,
  ]) as ChatInputCommandInteraction;

  return cmd;
}

export function mockRole(data: {
  client: SapphireClient;
  permissions: PermissionResolvable;
  guild: Guild;
  role?: Partial<RawRoleData>;
}) {
  const { client, permissions, guild, role } = data;
  const role_data: RawRoleData = {
    color: 0,
    hoist: false,
    id: "1",
    managed: false,
    mentionable: false,
    name: "test",
    position: 0,
    permissions: PermissionsBitField.resolve(permissions).toString(),
    ...role,
  };
  const created_role = Reflect.construct(Role, [client, role_data, guild]) as Role;
  guild.roles.cache.set(created_role.id, created_role);
  return created_role;
}
