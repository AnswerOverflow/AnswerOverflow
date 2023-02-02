import { Message, getDefaultMessage } from "@answeroverflow/elastic-types";
import {
  type DiscordAccount,
  getDefaultDiscordAccount,
  type Server,
  type Channel,
  getDefaultServer,
  getDefaultChannel,
} from "@answeroverflow/prisma-types";
import { getRandomId } from "@answeroverflow/utils";
import { ChannelType } from "discord-api-types/v10";
export function mockAccount(override: Partial<DiscordAccount> = {}) {
  const account = getDefaultDiscordAccount({
    id: getRandomId(),
    name: "test-user",
    ...override,
  });
  return account;
}

export function mockMessage(
  server: Server,
  channel: Channel,
  author: DiscordAccount,
  override: Omit<Partial<Message>, "author_id" | "channel_id" | "server_id"> = {}
) {
  return getDefaultMessage({
    id: getRandomId(),
    author_id: author.id,
    channel_id: channel.id,
    server_id: server.id,
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

export function mockChannel(server: Server, override?: Omit<Partial<Channel>, "server_id">) {
  return getDefaultChannel({
    id: getRandomId(),
    name: "test-channel",
    server_id: server?.id ?? getRandomId(),
    type: ChannelType.GuildText,
    parent_id: null,
    ...override,
  });
}

export function mockThread(
  parent: Channel,
  override?: Omit<Partial<Channel>, "parent_id" | "server_id">
) {
  return getDefaultChannel({
    id: getRandomId(),
    name: "test-thread",
    server_id: parent.server_id,
    type: ChannelType.PublicThread,
    parent_id: parent.id,
    ...override,
  });
}
