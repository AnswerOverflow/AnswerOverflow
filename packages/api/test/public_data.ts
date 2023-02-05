import {
  DiscordAccount,
  getDefaultDiscordAccount,
  getDefaultMessage,
  Message,
  Server,
} from "@answeroverflow/db";
import { pick } from "@answeroverflow/utils";
import type { MessageWithDiscordAccount } from "~api/router/message/types";

export function pickPublicServerData(server: Server) {
  return pick(server, ["id", "name", "icon"]);
}

export function toMessageWithDiscordAccount(
  message: Message,
  author: DiscordAccount,
  public_message: boolean
) {
  const public_msg: MessageWithDiscordAccount = {
    ...message,
    author,
    public: public_message,
  };
  return public_msg;
}

export function toPrivateMessageWithStrippedData(message: MessageWithDiscordAccount) {
  const author = getDefaultDiscordAccount({
    id: "0",
    name: "Unknown User",
  });
  const private_msg: MessageWithDiscordAccount = {
    ...getDefaultMessage({
      author_id: author.id,
      channel_id: message.channel_id,
      server_id: message.server_id,
      id: message.id,
    }),
    author,
    public: false,
  };
  return private_msg;
}
