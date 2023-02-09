import {
  DiscordAccount,
  getDefaultDiscordAccount,
  getDefaultMessage,
  Message,
  MessageWithDiscordAccount,
  Server,
} from "@answeroverflow/db";
import { pick } from "@answeroverflow/utils";

export function pickPublicServerData(server: Server) {
  return pick(server, ["id", "name", "icon"]);
}

export function toMessageWithDiscordAccount(
  message: Message,
  author: DiscordAccount,
  publicMessage: boolean
) {
  const publicMsg: MessageWithDiscordAccount = {
    ...message,
    author,
    public: publicMessage,
  };
  return publicMsg;
}

export function toPrivateMessageWithStrippedData(message: MessageWithDiscordAccount) {
  const author = getDefaultDiscordAccount({
    id: "0",
    name: "Unknown User",
  });
  const privateMsg: MessageWithDiscordAccount = {
    ...getDefaultMessage({
      authorId: author.id,
      channelId: message.channelId,
      serverId: message.serverId,
      id: message.id,
    }),
    author,
    public: false,
  };
  return privateMsg;
}
