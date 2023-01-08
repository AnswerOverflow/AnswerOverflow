import type { SapphireClient } from "@sapphire/framework";
import {
  ClientUser,
  Guild,
  GuildMember,
  PermissionResolvable,
  PermissionsBitField,
  User,
} from "discord.js";
import type { RawGuildMemberData, RawUserData } from "discord.js/typings/rawDataTypes";
import { randomSnowflake } from "~discord-bot/utils/utils";
import { mockGuild, mockRole } from "./guild-mock";

export function mockUser(client: SapphireClient, data: Partial<RawUserData> = {}) {
  const raw_data: RawUserData = {
    id: randomSnowflake().toString(),
    username: "USERNAME",
    discriminator: "user#0000",
    avatar: "user avatar url",
    bot: false,
    ...data,
  };
  const user = Reflect.construct(User, [client, raw_data]) as User;
  client.users.cache.set(user.id, user);
  return user;
}

export function mockClientUser(client: SapphireClient, override: Partial<RawUserData> = {}) {
  const raw_data: RawUserData = {
    id: "0",
    username: "test",
    discriminator: "0000",
    avatar: null,
    bot: false,
    ...override,
  };
  const client_user = Reflect.construct(ClientUser, [client, raw_data]) as ClientUser;
  client.user = client_user;
  return client_user;
}

export function mockGuildMember(
  client: SapphireClient,
  user?: User,
  guild?: Guild,
  permissions: PermissionResolvable = PermissionsBitField.Default,
  data: Partial<RawGuildMemberData> = {}
) {
  if (!user) {
    user = mockUser(client);
  }
  if (!guild) {
    guild = mockGuild(client, user); // By default make the guild owner the user
  }

  // Create a custom role that represents the permission the user has
  const role = mockRole(client, permissions, guild);

  const raw_data: RawGuildMemberData = {
    guild_id: guild.id,
    roles: [role.id],
    deaf: false,
    user: {
      id: user.id,
    },
    joined_at: "33",
    mute: false,
    ...data,
  };

  const member = Reflect.construct(GuildMember, [client, raw_data, guild]) as GuildMember;
  guild.members.cache.set(member.id, member);
  return member;
}
