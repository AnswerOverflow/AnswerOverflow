import type {
  ChannelPublicWithFlags,
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
    channelId: "0",
    childThread: null,
    images: [],
    parentChannelId: null,
    messageReference: null,
    serverId: "0",
    solutionIds: [],
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

export function mockChannel(override: Partial<ChannelPublicWithFlags> = {}) {
  const data: ChannelPublicWithFlags = {
    id: randomId(),
    name: "general",
    serverId: "0",
    parentId: null,
    type: 0,
    inviteCode: null,
    ...override,
  };
  return data;
}

export function mockChannelWithSettings(override: Partial<ChannelPublicWithFlags> = {}) {
  const data: ChannelPublicWithFlags = {
    id: randomId(),
    name: "general",
    serverId: "0",
    parentId: null,
    type: 0,
    inviteCode: null,
    ...override,
  };
  return data;
}
