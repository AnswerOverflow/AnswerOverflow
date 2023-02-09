import type { Channel, DiscordAccount, Server, User, UserServerSettings } from "@prisma/client";

export function getDefaultUser(
  override: Partial<User> & {
    id: string;
  }
): User {
  return {
    email: null,
    emailVerified: null,
    image: null,
    name: null,
    ...override,
  };
}

export function getDefaultServer(override: Partial<Server> & { id: string; name: string }): Server {
  const data: Server = {
    icon: null,
    kickedTime: null,
    bitfield: 0,
    ...override,
  };
  return data;
}

export function getDefaultChannel(
  override: Partial<Channel> & Pick<Channel, "id" | "name" | "serverId" | "parentId" | "type">
): Channel {
  const data: Channel = {
    bitfield: 0,
    inviteCode: null,
    lastIndexedSnowflake: null,
    solutionTagId: null,
    ...override,
  };
  return data;
}

export function getDefaultDiscordAccount(
  override: Partial<DiscordAccount> & { id: string; name: string }
): DiscordAccount {
  const data: DiscordAccount = {
    avatar: null,
    ...override,
  };
  return data;
}

export function getDefaultUserServerSettings(
  override: Partial<UserServerSettings> & { userId: string; serverId: string }
): UserServerSettings {
  const data: UserServerSettings = {
    bitfield: 0,
    ...override,
  };
  return data;
}
