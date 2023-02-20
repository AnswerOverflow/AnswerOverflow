import { z } from "zod";
import { MergeRouters, withDiscordAccountProcedure, router } from "~api/router/trpc";
import { TRPCError } from "@trpc/server";
import { protectedFetchWithPublicData } from "~api/utils/protected-procedures";
import { assertIsUserInServer } from "~api/utils/permissions";
import {
  getDefaultDiscordAccount,
  getDefaultMessage,
  findMessagesByChannelId,
  zFindMessagesByChannelId,
  findManyMessages,
  findMessageById,
  MessageWithAccountAndRepliesTo,
  MessageWithDiscordAccount,
  isMessageWithAccountAndRepliesTo,
} from "@answeroverflow/db";
import type { DiscordServer } from "@answeroverflow/auth";

// Kind of ugly having it take in two different types, but it's the easiest way to do it
export function stripPrivateMessageData(
  message: MessageWithAccountAndRepliesTo | MessageWithDiscordAccount,
  userServers: DiscordServer[] | null = null
): MessageWithAccountAndRepliesTo | MessageWithDiscordAccount {
  const isReply = !isMessageWithAccountAndRepliesTo(message);
  if (isReply && message.public) {
    return message;
  }
  if (!isReply && message.public && !message.referencedMessage) {
    return message;
  }

  if (userServers) {
    const userServer = userServers.find((s) => s.id === message.serverId);
    if (userServer) {
      return message;
    }
  }
  const defaultAuthor = getDefaultDiscordAccount({
    id: "0",
    name: "Unknown User",
  });
  const defaultMessage = getDefaultMessage({
    channelId: message.channelId,
    serverId: message.serverId,
    authorId: defaultAuthor.id,
    id: message.id,
    childThread: null,
  });

  if (isReply || !message.referencedMessage) {
    return {
      ...defaultMessage,
      author: defaultAuthor,
      public: false,
      referencedMessage: null,
    };
  }

  const reply = stripPrivateMessageData(message.referencedMessage, userServers);

  return {
    ...defaultMessage,
    author: defaultAuthor,
    public: false,
    referencedMessage: reply,
  };
}

export function stripPrivateMessagesData(
  messages: MessageWithAccountAndRepliesTo[],
  userServers: DiscordServer[] | null = null
) {
  return messages.map((m) => stripPrivateMessageData(m, userServers));
}

const messageCrudRouter = router({
  byId: withDiscordAccountProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findMessageById(input),
      permissions: (data) => assertIsUserInServer(ctx, data.serverId),
      publicDataFormatter: (data) => stripPrivateMessageData(data),
      notFoundMessage: "Message not found",
    });
  }),
  byChannelIdBulk: withDiscordAccountProcedure
    .input(zFindMessagesByChannelId)
    .query(async ({ ctx, input }) => {
      return protectedFetchWithPublicData({
        async fetch() {
          const messages = await findMessagesByChannelId(input);
          if (messages.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "No messages found",
            });
          }
          return messages;
        },
        permissions: (data) => data.map((m) => assertIsUserInServer(ctx, m.serverId)),
        publicDataFormatter: (data) => stripPrivateMessagesData(data),
        notFoundMessage: "Messages not found",
      });
    }),
  byIdBulk: withDiscordAccountProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findManyMessages(input),
      permissions: (data) => data.map((m) => assertIsUserInServer(ctx, m.serverId)),
      publicDataFormatter: (data) => stripPrivateMessagesData(data, ctx.userServers),
      notFoundMessage: "Messages not found",
    });
  }),
});

export const messageRouter = MergeRouters(messageCrudRouter);
