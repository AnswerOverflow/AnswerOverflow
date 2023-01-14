import { z } from "zod";
import {
  mergeRouters,
  withDiscordAccountProcedure,
  router,
  publicProcedure,
} from "~api/router/trpc";
import {
  protectedMessageFetch,
  protectedMessageMutation,
  protectedMessageMutationFetchFirst,
} from "~api/utils/protected-procedures/message-editor-procedures";
import { ignored_discord_account_router } from "../users/ignored-discord-accounts/ignored-discord-account";
import { assertIsNotDeletedUser } from "~api/router/users/ignored-discord-accounts/ignored-discord-account";
import { TRPCError } from "@trpc/server";
import { findOrThrowNotFound } from "~api/utils/operations";
import { discordAccountRouter, z_discord_account_public } from "../users/accounts/discord-accounts";

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
  thread_id: z.string().nullable(),
  child_thread: z.string().nullable(),
  author_id: z.string(),
  channel_id: z.string(),
  server_id: z.string(),
});

export const z_message_with_discord_account = z_message
  .extend({
    author: z_discord_account_public,
  })
  .omit({ author_id: true });

const message_find_router = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return findOrThrowNotFound(() => ctx.elastic.getMessage(input), "Message not found");
  }),
  byIdBulk: withDiscordAccountProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return protectedMessageFetch({
      ctx,
      author_id: input.map((i) => i),
      fetch: () => ctx.elastic.bulkGetMessages(input),
      not_found_message: "Message not found",
    });
  }),
  all: publicProcedure.query(async ({ ctx }) => {
    const all_messages = await ctx.elastic.getAllMessages();
    const authors = await discordAccountRouter
      .createCaller(ctx)
      .byIdMany(all_messages.map((m) => m.author_id));
    const author_lookup = new Map(authors.map((a) => [a.id, a]));
    return z
      .array(z_message_with_discord_account)
      .parse(
        all_messages.map((m) =>
          z_message_with_discord_account.parse({ ...m, author: author_lookup.get(m.author_id) })
        )
      );
  }),
});

const message_crud_router = router({
  update: withDiscordAccountProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    return protectedMessageMutation({
      ctx,
      author_id: input.id,
      operation: () => ctx.elastic.updateMessage(input),
    });
  }),
  upsert: withDiscordAccountProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    await assertIsNotDeletedUser(ctx, input.author_id);
    return protectedMessageMutation({
      ctx,
      author_id: input.id,
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
      const status = await protectedMessageMutation({
        ctx,
        author_id: filtered_messages.map((msg) => msg.author_id),
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
    return protectedMessageMutationFetchFirst({
      ctx,
      getAuthorId: (data) => data.author_id,
      fetch: () => message_find_router.createCaller(ctx).byId(input),
      operation: () => ctx.elastic.deleteMessage(input),
      not_found_message: "Message not found",
    });
  }),
  deleteByThreadId: withDiscordAccountProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return protectedMessageMutationFetchFirst({
        ctx,
        getAuthorId: (data) => data.author_id,
        fetch: () => message_find_router.createCaller(ctx).byId(input),
        operation: () => ctx.elastic.deleteMessagesByThreadId(input),
        not_found_message: "Message not found",
      });
    }),
  deleteBulk: withDiscordAccountProcedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx, input }) => {
      return protectedMessageMutationFetchFirst({
        ctx,
        getAuthorId: (data) => data.map((d) => d.author_id),
        fetch: () => message_find_router.createCaller(ctx).byIdBulk(input),
        operation: () => ctx.elastic.bulkDeleteMessages(input),
        not_found_message: "Message not found",
      });
    }),
});

export const messageRouter = mergeRouters(message_find_router, message_crud_router);
