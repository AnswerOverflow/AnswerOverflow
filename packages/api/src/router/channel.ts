import { getDefaultChannel } from "@answeroverflow/db";
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
  createBulk: publicProcedure
    .input(z.array(channel_create_input))
    .mutation(async ({ ctx, input }) => {
      // 1. Ensure all foreign keys are created
      // Get a unique list of servers
      const servers = Array.from(new Set(input.map((channel) => channel.server.create)));
      await serverRouter.createCaller(ctx).upsertBulk(
        servers.map((server) => ({
          create: server,
          update: server,
        }))
      );

      // 2. Create all channels
      await ctx.prisma.channel.createMany({
        data: input.map((channel) => {
          const { server, ...channel_data } = channel;
          return {
            ...channel_data,
            server_id: server.create.id,
          };
        }),
        skipDuplicates: true,
      });

      return input.map((channel) =>
        getDefaultChannel({ ...channel, server_id: channel.server.create.id })
      );
    }),
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
  updateBulk: publicProcedure
    .input(
      z.array(
        z.object({
          update: channel_update_input,
          old: z_channel,
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(
        input.map((channel) =>
          ctx.prisma.channel.update({
            where: {
              id: channel.old.id,
            },
            data: {
              ...channel.update,
            },
          })
        )
      );
    }),
});

const channelFetchRouter = router({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.channel.findMany();
  }),
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.channel.findFirst({ where: { id: input } });
  }),
  byIdBulk: publicProcedure.input(z.array(z.string())).query(({ ctx, input }) => {
    return ctx.prisma.channel.findMany({ where: { id: { in: input } } });
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
  upsertBulk: publicProcedure
    .input(z.array(channel_upsert_input))
    .mutation(async ({ ctx, input }) => {
      const channel_create_update = channelCreateUpdate.createCaller(ctx);

      const created_channels = await channel_create_update.createBulk(
        input.map((channel) => channel.create)
      );

      const old_channel_data_lookup = new Map(
        created_channels.map((channel) => [channel.id, channel])
      );
      return await channel_create_update.updateBulk(
        input.map((channel) => ({
          old: old_channel_data_lookup.get(channel.create.id)!,
          update: channel.update,
        }))
      );
    }),
});

export const channelRouter = mergeRouters(channelFetchRouter, channelUpsert);
