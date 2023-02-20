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
} from "@answeroverflow/db";
import type { DiscordServer } from "@answeroverflow/auth";

export function stripPrivateMessageData(
  message: MessageWithAccountAndRepliesTo,
  userServers: DiscordServer[] | null = null
): MessageWithAccountAndRepliesTo {
  if (message.public && message.repliesTo?.public) {
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

  if (!message.repliesTo) {
    return {
      ...defaultMessage,
      author: defaultAuthor,
      public: false,
      repliesTo: null,
    };
  }

  const reply = stripPrivateMessageData(message.repliesTo, userServers);

  return {
    ...defaultMessage,
    author: defaultAuthor,
    public: false,
    repliesTo: reply,
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
