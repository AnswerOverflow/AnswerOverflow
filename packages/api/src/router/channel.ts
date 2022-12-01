import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "../trpc";
import { serverRouter, server_upsert_input } from "./server";

export const channel_create_input = z.object({
  name: z.string(),
  id: z.string(),
  type: z.number(),
  server: server_upsert_input,
});

export const channel_update_input = z.object({
  name: z.optional(z.string()),
});

export const channel_upsert_input = z.object({
  create: channel_create_input,
  update: channel_update_input,
});

const z_channel = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
  server_id: z.string(),
});

const channelCreateUpdate = router({
  update: publicProcedure
    .input(
      z.object({
        update: channel_update_input,
        old: z_channel,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.prisma.channel.update({
        where: {
          id: input.old.id,
        },
        data: {
          ...input.update,
        },
      });
      return data;
    }),
  create: publicProcedure.input(channel_create_input).mutation(async ({ ctx, input }) => {
    const { server, ...channel } = input;
    const updated_server = await serverRouter.createCaller(ctx).upsert(server);
    return ctx.prisma.channel.create({
      data: {
        ...channel,
        server: {
          connect: {
            id: updated_server.id,
          },
        },
      },
    });
  }),
});

const channelFetchRouter = router({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.channel.findMany();
  }),
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.channel.findFirst({ where: { id: input } });
  }),
});

const channelUpsert = router({
  upsert: publicProcedure.input(channel_upsert_input).mutation(async ({ ctx, input }) => {
    const channel_fetch = channelFetchRouter.createCaller(ctx);
    const channel_update_create = channelCreateUpdate.createCaller(ctx);
    const existing_channel = await channel_fetch.byId(input.create.id);
    if (existing_channel) {
      return channel_update_create.update({
        old: existing_channel,
        update: input.update,
      });
    } else {
      return channel_update_create.create(input.create);
    }
  }),
});

export const channelRouter = mergeRouters(channelFetchRouter, channelUpsert);
