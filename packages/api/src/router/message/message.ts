import { z } from "zod";
import { publicProcedure, router } from "~api/router/trpc";

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

export const messageRouter = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.elastic.getMessage(input);
  }),
  update: publicProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    return ctx.elastic.updateMessage(input);
  }),
  upsert: publicProcedure.input(z_message).mutation(async ({ ctx, input }) => {
    return ctx.elastic.upsertMessage(input);
  }),
  delete: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.elastic.deleteMessage(input);
  }),
  deleteByThreadId: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.elastic.deleteMessagesByThreadId(input);
  }),
  deleteBulk: publicProcedure.input(z.array(z.string())).mutation(async ({ ctx, input }) => {
    return ctx.elastic.bulkDeleteMessages(input);
  }),
});
