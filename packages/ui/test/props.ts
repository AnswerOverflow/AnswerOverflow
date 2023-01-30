import type {
  ChannelPublic,
  DiscordAccountPublic,
  MessageWithDiscordAccount,
  ServerPublic,
} from "@answeroverflow/api";

export function randomId() {
  return Math.floor(Math.random() * 10000000).toString();
}

export function mockDiscordAccount(override: Partial<DiscordAccountPublic> = {}) {
  const data: DiscordAccountPublic = {
    id: randomId(),
    name: "John Doe",
    avatar: null,
    ...override,
  };
  return data;
}

export function mockMessageWithDiscordAccount(override: Partial<MessageWithDiscordAccount> = {}) {
  const data: MessageWithDiscordAccount = {
    id: randomId(),
    content: "Hello, world!",
    author: mockDiscordAccount(),
    channel_id: "0",
    child_thread: null,
    images: [],
    replies_to: null,
    server_id: "0",
    solutions: [],
    public: true,
    ...override,
  };
  return data;
}

export function mockServer(override: Partial<ServerPublic> = {}) {
  const data: ServerPublic = {
    id: randomId(),
    name: "Test Server",
    icon: null,
    ...override,
  };
  return data;
}

export function mockChannel(override: Partial<ChannelPublic> = {}) {
  const data: ChannelPublic = {
    id: randomId(),
    name: "general",
    server_id: "0",
    parent_id: null,
    type: 0,
    settings: {
      invite_code: null,
    },
    ...override,
  };
  return data;
}
