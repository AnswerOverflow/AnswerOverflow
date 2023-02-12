import { Message, getDefaultMessage } from "@answeroverflow/elastic-types";
import {
  type DiscordAccount,
  getDefaultDiscordAccount,
  type Server,
  type Channel,
  getDefaultServer,
  getDefaultChannel,
  getDefaultUserServerSettings,
  UserServerSettings,
  UserServerSettingsWithFlags,
  addFlagsToUserServerSettings,
} from "@answeroverflow/prisma-types";
import { getRandomId } from "@answeroverflow/utils";
import { ChannelType } from "discord-api-types/v10";
import type { PartialDeep } from "type-fest";
export function mockDiscordAccount(override: Partial<DiscordAccount> = {}) {
  const account = getDefaultDiscordAccount({
    id: getRandomId(),
    name: `U-${getRandomId().slice(0, 10)}`,
    ...override,
  });
  return account;
}

export function mockMessage(
  server: Server,
  channel: Channel,
  author: DiscordAccount,
  override: Omit<Partial<Message>, "authorId" | "channelId" | "serverId"> = {}
) {
  return getDefaultMessage({
    id: getRandomId(),
    authorId: author.id,
    channelId: channel.id,
    serverId: server.id,
    ...override,
  });
}

export function mockServer(override: Partial<Server> = {}) {
  return getDefaultServer({
    id: getRandomId(),
    name: "test-server",
    icon: "ASDASDASDASDsd",
    ...override,
  });
}

export function mockChannel(server: Server, override?: Omit<Partial<Channel>, "serverId">) {
  return getDefaultChannel({
    id: getRandomId(),
    name: "test-channel",
    serverId: server.id ?? getRandomId(),
    type: ChannelType.GuildText,
    parentId: null,
    ...override,
  });
}

export function mockThread(
  parent: Channel,
  override?: Omit<Partial<Channel>, "parentId" | "serverId">
) {
  return getDefaultChannel({
    id: getRandomId(),
    name: "test-thread",
    serverId: parent.serverId,
    type: ChannelType.PublicThread,
    parentId: parent.id,
    ...override,
  });
}

export function mockUserServerSettings(override: Partial<UserServerSettings> = {}) {
  return {
    ...getDefaultUserServerSettings({
      serverId: getRandomId(),
      userId: getRandomId(),
    }),
    ...override,
  };
}

export function mockUserServerSettingsWithFlags(
  override: Omit<PartialDeep<UserServerSettingsWithFlags>, "bitfield"> = {}
): UserServerSettingsWithFlags {
  const base = addFlagsToUserServerSettings(mockUserServerSettings());
  const { flags, ...rest } = override;
  return {
    ...base,
    flags: {
      ...base.flags,
      ...flags,
    },
    ...rest,
  };
}
