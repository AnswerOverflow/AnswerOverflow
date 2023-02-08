import { z } from "zod";
import { MergeRouters, with_discord_account_procedure, router } from "~api/router/trpc";
import { TRPCError } from "@trpc/server";
import { protectedFetchWithPublicData } from "~api/utils/protected-procedures";
import { assertIsUserInServer } from "~api/utils/permissions";
import {
  getDefaultDiscordAccount,
  getDefaultMessage,
  z_message_with_discord_account,
  findMessagesByChannelId,
  z_find_messages_by_channel_id,
  findManyMessages,
  findMessageById,
} from "@answeroverflow/db";
import type { DiscordServer } from "@answeroverflow/auth";

export function stripPrivateMessageData(
  message: z.infer<typeof z_message_with_discord_account>,
  user_servers: DiscordServer[] | null = null
) {
  if (message.public) {
    return message;
  }
  if (user_servers) {
    const user_server = user_servers.find((s) => s.id === message.server_id);
    if (user_server) {
      return message;
    }
  }
  const default_author = getDefaultDiscordAccount({
    id: "0",
    name: "Unknown User",
  });
  const default_message = getDefaultMessage({
    channel_id: message.channel_id,
    server_id: message.server_id,
    author_id: default_author.id,
    id: message.id,
    child_thread: null,
  });
  return {
    ...default_message,
    author: default_author,
    public: false,
  };
}

export function stripPrivateMessagesData(
  messages: z.infer<typeof z_message_with_discord_account>[],
  user_servers: DiscordServer[] | null = null
) {
  return messages.map((m) => stripPrivateMessageData(m, user_servers));
}

const message_crud_router = router({
  byId: with_discord_account_procedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findMessageById(input),
      permissions: (data) => assertIsUserInServer(ctx, data.server_id),
      public_data_formatter: (data) => stripPrivateMessageData(data),
      not_found_message: "Message not found",
    });
  }),
  byChannelIdBulk: with_discord_account_procedure
    .input(z_find_messages_by_channel_id)
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
        permissions: (data) => data.map((m) => assertIsUserInServer(ctx, m.server_id)),
        public_data_formatter: (data) => stripPrivateMessagesData(data),
        not_found_message: "Messages not found",
      });
    }),
  byIdBulk: with_discord_account_procedure
    .input(z.array(z.string()))
    .query(async ({ ctx, input }) => {
      return protectedFetchWithPublicData({
        fetch: () => findManyMessages(input),
        permissions: (data) => data.map((m) => assertIsUserInServer(ctx, m.server_id)),
        public_data_formatter: (data) => stripPrivateMessagesData(data, ctx.user_servers),
        not_found_message: "Messages not found",
      });
    }),
});

export const message_router = MergeRouters(message_crud_router);
