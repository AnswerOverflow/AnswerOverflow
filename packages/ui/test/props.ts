import type { AvatarProps } from "../src/components/Avatar";
import type {
  ChannelPublic,
  DiscordAccountPublic,
  MessageWithDiscordAccount,
  ServerPublic,
} from "@answeroverflow/api";
export const default_avatar: AvatarProps = {
  user: { name: "John Doe", id: "0", avatar: null },
};

export const with_image: AvatarProps = {
  user: { name: "Rhys", id: "523949187663134754", avatar: "7716e305f7de26045526d9da6eef2dab" },
};

export function mockDiscordAccount(override: Partial<DiscordAccountPublic> = {}) {
  const data: DiscordAccountPublic = {
    id: "0",
    name: "John Doe",
    avatar: null,
    ...override,
  };
  return data;
}

export function mockMessageWithDiscordAccount(override: Partial<MessageWithDiscordAccount> = {}) {
  const data: MessageWithDiscordAccount = {
    id: "0",
    content: "Hello, world!",
    author: mockDiscordAccount(),
    channel_id: "0",
    child_thread: null,
    images: [],
    replies_to: null,
    server_id: "0",
    solutions: [],
    thread_id: "0",
    ...override,
  };
  return data;
}

export function mockServer(override: Partial<ServerPublic> = {}) {
  const data: ServerPublic = {
    id: "843301848295014421",
    name: "Test Server",
    icon: null,
    ...override,
  };
  return data;
}

export function mockChannel(override: Partial<ChannelPublic> = {}) {
  const data: ChannelPublic = {
    id: "0",
    name: "general",
    server_id: "0",
    parent_id: null,
    type: 0,
    ...override,
  };
  return data;
}
