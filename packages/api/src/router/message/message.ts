import { z } from "zod";
import { mergeRouters, authedProcedure, router } from "~api/router/trpc";
import {
  protectedMessageFetch,
  protectedMessageMutation,
  protectedMessageMutationFetchFirst,
} from "~api/utils/protected-procedures/message-editor-procedures";

export const z_message = z.object({
  id: z.string(),
  content: z.string(),
  images: z.array(z.string()),
  solutions: z.array(z.string()),
  replies_to: z.string().nullable(),
  thread_id: z.string().nullable(),
  child_thread: z.string().nullable(),
  author_id: z.string(),
  channel_id: z.string(),
  server_id: z.string(),
});

const message_find_router = router({
  byId: authedProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedMessageFetch({
      ctx,
      author_id: input,
      fetch: () => ctx.elastic.getMessage(input),
      not_found_message: "Message not found",
    });
  }),
  byIdBulk: authedProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return protectedMessageFetch({
      ctx,
      author_id: input.map((i) => i),
      fetch: () => ctx.elastic.bulkGetMessages(input),
      not_found_message: "Message not found",
    });
  }),
});

const message_crud_router = router({
  update: authedProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    return protectedMessageMutation({
      ctx,
      author_id: input.id,
      operation: () => ctx.elastic.updateMessage(input),
    });
  }),
  upsert: authedProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    return protectedMessageMutation({
      ctx,
      author_id: input.id,
      operation: () => ctx.elastic.upsertMessage(input),
    });
  }),
  delete: authedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedMessageMutationFetchFirst({
      ctx,
      getAuthorId: (data) => data.author_id,
      fetch: () => message_find_router.createCaller(ctx).byId(input),
      operation: () => ctx.elastic.deleteMessage(input),
      not_found_message: "Message not found",
    });
  }),
  deleteByThreadId: authedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedMessageMutationFetchFirst({
      ctx,
      getAuthorId: (data) => data.author_id,
      fetch: () => message_find_router.createCaller(ctx).byId(input),
      operation: () => ctx.elastic.deleteMessagesByThreadId(input),
      not_found_message: "Message not found",
    });
  }),
  deleteBulk: authedProcedure.input(z.array(z.string())).mutation(async ({ ctx, input }) => {
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
