import { z } from "zod";
import { mergeRouters, withDiscordAccountProcedure, router } from "~api/router/trpc";

import { ignored_discord_account_router } from "../users/ignored-discord-accounts/ignored-discord-account";
import { assertIsNotDeletedUser } from "~api/router/users/ignored-discord-accounts/ignored-discord-account";
import { TRPCError } from "@trpc/server";
import { z_discord_account_public } from "../users/accounts/discord-accounts";
import {
  protectedFetchWithPublicData,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";
import { assertIsAnswerOverflowBot, assertIsUser } from "~api/utils/permissions";
import { userServerSettingsRouter } from "../user-server-settings/user-server-settings";
import { getDefaultDiscordAccount, getDefaultMessage } from "@answeroverflow/db";

const z_discord_image = z.object({
  url: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  description: z.string().nullable(),
});

export const z_message = z.object({
  id: z.string(),
  content: z.string(),
  images: z.array(z_discord_image),
  solutions: z.array(z.string()),
  replies_to: z.string().nullable(),
  child_thread: z.string().nullable(),
  author_id: z.string(),
  channel_id: z.string(),
  server_id: z.string(),
});

const z_message_public = z_message.pick({
  id: true,
  content: true,
  images: true,
  solutions: true,
  replies_to: true,
  child_thread: true,
  author_id: true,
  channel_id: true,
  server_id: true,
});
export const z_message_with_discord_account = z_message
  .extend({
    author: z_discord_account_public,
    public: z.boolean().default(false),
  })
  .omit({ author_id: true });

const message_find_router = router({
  byId: withDiscordAccountProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => ctx.elastic.getMessage(input),
      not_found_message: "Message not found",
      permissions: (data) => assertIsUser(ctx, data.author_id),
      public_data_formatter: (data) => z_message_public.parse(data),
    });
  }),
  byChannelIdBulk: withDiscordAccountProcedure
    .input(
      z.object({
        channel_id: z.string(),
        after: z.string().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const messages = await protectedFetchWithPublicData({
        fetch: () =>
          ctx.elastic.bulkGetMessagesByChannelId(input.channel_id, input.after, input.limit),
        permissions: (data) => data.map((d) => assertIsUser(ctx, d.author_id)),
        public_data_formatter: (data) => data.map((d) => z_message_public.parse(d)),
        not_found_message: "Messages not found",
      });
      const authors = await userServerSettingsRouter.createCaller(ctx).byIdManyWithDiscordAccounts({
        user_ids: messages.map((m) => m.author_id),
        server_id: messages[0]!.server_id,
      });
      const filtered_authors = authors.filter(
        (a) => a.flags.can_publicly_display_messages === true
      );
      const author_lookup = new Map(filtered_authors.map((a) => [a.user_id, a.user]));
      const messages_with_private_data_removed = messages.map((m) => {
        const author = author_lookup.get(m.author_id);
        if (author) {
          return z_message_with_discord_account.parse({ ...m, author, public: true });
        } else {
          const default_message = getDefaultMessage({
            author_id: "0",
            channel_id: m.channel_id,
            server_id: m.server_id,
            id: m.id,
          });
          return z_message_with_discord_account.parse({
            ...default_message,
            public: false,
            author: getDefaultDiscordAccount({
              id: "0",
              name: "",
              avatar: null,
            }),
          });
        }
      });
      return messages_with_private_data_removed;
    }),
  byIdBulk: withDiscordAccountProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => ctx.elastic.bulkGetMessages(input),
      permissions: (data) => data.map((d) => assertIsUser(ctx, d.author_id)),
      public_data_formatter: (data) => data.map((d) => z_message_public.parse(d)),
      not_found_message: "Messages not found",
    });
  }),
});

// Answer Overflow is a mirror of Discord, therefore the only account that can edit messages is the Answer Overflow bot
const message_crud_router = router({
  update: withDiscordAccountProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsAnswerOverflowBot(ctx),
      operation: () => ctx.elastic.updateMessage(input),
    });
  }),
  upsert: withDiscordAccountProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    return protectedMutation({
      permissions: [
        () => assertIsAnswerOverflowBot(ctx),
        () => assertIsNotDeletedUser(ctx, input.author_id),
      ],
      operation() {
        return ctx.elastic.upsertMessage(input);
      },
    });
  }),
  upsertBulk: withDiscordAccountProcedure
    .input(z.array(z_message))
    .mutation(async ({ ctx, input }) => {
      const author_ids = new Set(input.map((msg) => msg.author_id));
      const ignored_accounts = await ignored_discord_account_router
        .createCaller(ctx)
        .byIdMany([...author_ids]);
      const ignored_account_ids = new Set(ignored_accounts.map((i) => i.id));
      const filtered_messages = input.filter((msg) => !ignored_account_ids.has(msg.author_id));
      const status = await protectedMutation({
        permissions: () => assertIsAnswerOverflowBot(ctx),
        operation() {
          return ctx.elastic.bulkUpsertMessages(filtered_messages);
        },
      });
      if (!status) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upsert messages",
        });
      }
      return filtered_messages;
    }),
  delete: withDiscordAccountProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => message_find_router.createCaller(ctx).byId(input),
      operation: () => ctx.elastic.deleteMessage(input),
      not_found_message: "Message not found",
      permissions: () => assertIsAnswerOverflowBot(ctx),
    });
  }),
  deleteBulk: withDiscordAccountProcedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx, input }) => {
      return protectedMutationFetchFirst({
        permissions: () => assertIsAnswerOverflowBot(ctx),
        fetch: () => message_find_router.createCaller(ctx).byIdBulk(input),
        operation: () => ctx.elastic.bulkDeleteMessages(input),
        not_found_message: "Message not found",
      });
    }),
});

export const messageRouter = mergeRouters(message_find_router, message_crud_router);
