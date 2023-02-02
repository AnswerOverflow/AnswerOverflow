import type {
  Channel,
  ChannelSettings,
  DiscordAccount,
  Server,
  ServerSettings,
  User,
  UserServerSettings,
} from "@prisma/client";

export function getDefaultChannelSettings(
  override: Partial<ChannelSettings> & {
    channel_id: string;
  }
): ChannelSettings {
  return {
    bitfield: 0,
    invite_code: null,
    last_indexed_snowflake: null,
    solution_tag_id: null,
    ...override,
  };
}

export function getDefaultServerSettings(
  override: Partial<ServerSettings> & { server_id: string }
) {
  return {
    bitfield: 0,
    ...override,
  };
}

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
    kicked_time: null,
    ...override,
  };
  return data;
}

export function getDefaultChannel(
  override: Partial<Channel> & {
    id: string;
    name: string;
    server_id: string;
    type: number;
    parent_id: string | null;
  }
): Channel {
  const data: Channel = {
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
  override: Partial<UserServerSettings> & { user_id: string; server_id: string }
): UserServerSettings {
  const data: UserServerSettings = {
    bitfield: 0,
    ...override,
  };
  return data;
}
