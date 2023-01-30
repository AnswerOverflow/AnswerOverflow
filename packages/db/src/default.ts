import type {
  Channel,
  ChannelSettings,
  DiscordAccount,
  Server,
  ServerSettings,
  User,
  UserServerSettings,
} from "@prisma/client";
import type { Thread } from "..";
import { addChannelSettingsFlagsToChannelSettings } from "./channel-settings";
import type { Message } from "./elastic";

export function getDefaultChannelSettings(channel_id: string): ChannelSettings {
  return {
    channel_id: channel_id,
    bitfield: 0,
    invite_code: null,
    last_indexed_snowflake: null,
    solution_tag_id: null,
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

export function getDefaultChannelSettingsWithFlags(channel_id: string) {
  return addChannelSettingsFlagsToChannelSettings(getDefaultChannelSettings(channel_id));
}

export function getDefaultUser(user_id: string): User {
  return {
    email: null,
    emailVerified: null,
    id: user_id,
    image: null,
    name: null,
  };
}

export function getDefaultMessage(
  override: Partial<Message> & {
    id: string;
    channel_id: string;
    server_id: string;
    author_id: string;
  }
): Message {
  const data: Message = {
    content: "",
    images: [],
    replies_to: null,
    child_thread: null,
    solutions: [],
    ...override,
  };
  return data;
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
  override: Partial<Channel> & { id: string; name: string; server_id: string; type: number }
): Channel {
  const data: Channel = {
    ...override,
    parent_id: null,
  };
  return data;
}

export function getDefaultThread(
  override: Partial<Thread> & {
    id: string;
    name: string;
    server_id: string;
    type: number;
    parent_id: string;
  }
): Thread {
  const data: Thread = {
    ...override,
  };
  return data;
}

export type DiscordAccountRequired = { id: string; name: string };

export function getDefaultDiscordAccount(
  override: Partial<DiscordAccount> & DiscordAccountRequired
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
