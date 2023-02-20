import {
  DiscordAccount,
  getDefaultDiscordAccount,
  getDefaultMessage,
  isMessageWithAccountAndRepliesTo,
  Message,
  MessageWithAccountAndRepliesTo,
  MessageWithDiscordAccount,
  Server,
} from "@answeroverflow/db";
import { pick } from "@answeroverflow/utils";

export function pickPublicServerData(server: Server) {
  return pick(server, ["id", "name", "icon"]);
}

type ToMessageWithDiscordAccount = {
  message: Message;
  author: DiscordAccount;
  publicMessage: boolean;
};

export function toMessageWithDiscordAccount({
  message,
  author,
  publicMessage,
}: ToMessageWithDiscordAccount) {
  const msg: MessageWithDiscordAccount = {
    ...message,
    author,
    public: publicMessage,
  };
  return msg;
}

export function toMessageWithAccountAndRepliesTo({
  message,
  referenced = undefined,
  author,
  publicMessage,
}: ToMessageWithDiscordAccount & {
  referenced?: MessageWithDiscordAccount;
}) {
  const publicMsg: MessageWithAccountAndRepliesTo = {
    ...toMessageWithDiscordAccount({ message, author, publicMessage }),
    referencedMessage: referenced ?? null,
  };
  return publicMsg;
}

export function toPrivateMessageWithStrippedData(
  message: MessageWithDiscordAccount | MessageWithAccountAndRepliesTo
): MessageWithDiscordAccount | MessageWithAccountAndRepliesTo {
  const isReply = !isMessageWithAccountAndRepliesTo(message);

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
  if (isReply) {
    return privateMsg;
  }
  return {
    ...privateMsg,
    referencedMessage: message.referencedMessage
      ? toPrivateMessageWithStrippedData(message.referencedMessage)
      : null,
  };
}
