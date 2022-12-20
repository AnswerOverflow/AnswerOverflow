import type { ChannelSettings, User } from "@prisma/client";
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
  message_id: string,
  author_id: string,
  channel_id: string,
  server_id: string
): Message {
  const data: Message = {
    id: message_id,
    author_id: author_id,
    channel_id: channel_id,
    content: "",
    server_id: server_id,
    images: [],
    replies_to: null,
    thread_id: null,
    child_thread: null,
    solutions: [],
  };
  return data;
}
