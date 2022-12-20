import type { Message } from "@answeroverflow/db";
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { channelRouter, channel_upsert_input } from "./channel";
import { userRouter, user_create_input } from "./user";

export const z_message = z.object({
  id: z.string(),
  content: z.string(),
  images: z.array(z.string()),
  solutions: z.array(z.string()),
  replies_to: z.string().nullable(),
  thread_id: z.string().nullable(),
  child_thread: z.string().nullable(),
});

export const message_create_input = z.object({
  message: z_message,
  channel: channel_upsert_input,
  author: user_create_input,
});

export const messageRouter = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.elastic.getMessage(input);
  }),
  upsert: publicProcedure.input(message_create_input).mutation(async ({ ctx, input }) => {
    const channel_router = channelRouter.createCaller(ctx);
    const user_router = userRouter.createCaller(ctx);
    const [channel, author] = await Promise.all([
      channel_router.upsert(input.channel),
      user_router.upsert({
        id: input.author.id,
        name: input.author.name,
      }),
    ]);
    const converted_message: Message = {
      ...input.message,
      channel_id: channel.id,
      server_id: channel.server_id,
      author_id: author.id,
    };
    return ctx.elastic.indexMessage(converted_message);
  }),
  delete: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return ctx.elastic.deleteMessage(input);
  }),
  deleteBulk: publicProcedure.input(z.array(z.string())).mutation(async ({ ctx, input }) => {
    return ctx.elastic.bulkDeleteMessages(input);
  }),
});
