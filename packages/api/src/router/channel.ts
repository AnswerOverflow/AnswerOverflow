import { getDefaultChannel } from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "../trpc";
import { serverRouter, server_upsert_input } from "./server";

export const channel_create_input = z.object({
  name: z.string(),
  id: z.string(),
  type: z.number(),
  server_id: z.string(),
});

export const channel_create_with_deps_input = z.object({
  channel: channel_create_input,
  server: server_upsert_input,
});

export const channel_update_input = z.object({
  name: z.optional(z.string()),
});

export const channel_upsert_input = z.object({
  create: channel_create_input,
  update: channel_update_input,
});

export const channel_upsert_with_deps_input = z.object({
  create: channel_create_with_deps_input,
  update: channel_update_input,
});

const channelCreateUpdate = router({
  create: publicProcedure.input(channel_create_input).mutation(async ({ ctx, input }) => {
    return ctx.prisma.channel.create({
      data: {
        ...input,
      },
    });
  }),
  createBulk: publicProcedure
    .input(z.array(channel_create_input))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.channel.createMany({
        data: input.map((channel) => {
          return {
            ...channel,
          };
        }),
        skipDuplicates: true,
      });

      return input.map((channel) => getDefaultChannel({ ...channel }));
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        update: channel_update_input,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.prisma.channel.update({
        where: {
          id: input.id,
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
          id: z.string(),
          update: channel_update_input,
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.$transaction(
        input.map((data) =>
          ctx.prisma.channel.update({
            where: {
              id: data.id,
            },
            data: {
              ...data.update,
            },
          })
        )
      );
    }),
});

const channelCreateWithDeps = router({
  createWithDeps: publicProcedure
    .input(channel_create_with_deps_input)
    .mutation(async ({ ctx, input }) => {
      const { server, channel } = input;
      await serverRouter.createCaller(ctx).upsert(server);
      const channelCreateCaller = channelCreateUpdate.createCaller(ctx);
      return await channelCreateCaller.create(channel);
    }),
  createBulkWithDeps: publicProcedure
    .input(z.array(channel_create_with_deps_input))
    .mutation(async ({ ctx, input }) => {
      const servers = Array.from(new Set(input.map((channel) => channel.server.create)));
      await serverRouter.createCaller(ctx).upsertBulk(
        servers.map((server) => ({
          create: server,
          update: server,
        }))
      );

      return await channelCreateUpdate
        .createCaller(ctx)
        .createBulk(input.map((channel) => channel.channel));
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
        id: input.create.id,
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

      await channel_create_update.createBulk(input.map((channel) => channel.create));

      const updated_channels = await channel_create_update.updateBulk(
        input.map((channel) => ({
          id: channel.create.id,
          update: channel.update,
        }))
      );
      return updated_channels;
    }),
  upsertWithDeps: publicProcedure
    .input(channel_create_with_deps_input)
    .mutation(async ({ ctx, input }) => {
      const { server, channel } = input;
      await serverRouter.createCaller(ctx).upsert(server);
      const channel_fetch = channelFetchRouter.createCaller(ctx);
      const existing_channel = await channel_fetch.byId(channel.id);
      if (!existing_channel) {
        const channel_create_with_deps = channelCreateWithDeps.createCaller(ctx);
        return channel_create_with_deps.createWithDeps(input);
      } else {
        const channel_update = channelCreateUpdate.createCaller(ctx);
        return channel_update.update({
          id: existing_channel.id,
          update: channel,
        });
      }
    }),
  upsertBulkWithDeps: publicProcedure
    .input(z.array(channel_create_with_deps_input))
    .mutation(async ({ ctx, input }) => {
      const channel_fetch = channelFetchRouter.createCaller(ctx);
      const existing_channels = await channel_fetch.byIdBulk(
        input.map((channel) => channel.channel.id)
      );
      const existing_channel_lookup = new Map(
        existing_channels.map((channel) => [channel.id, channel])
      );

      const channels_to_create = input.filter(
        (channel) => !existing_channel_lookup.has(channel.channel.id)
      );

      const channels_to_update = input.filter((channel) =>
        existing_channel_lookup.has(channel.channel.id)
      );

      const channel_create_with_deps = channelCreateWithDeps.createCaller(ctx);
      const created_channels = await channel_create_with_deps.createBulkWithDeps(
        channels_to_create
      );
      const channel_update = channelCreateUpdate.createCaller(ctx);
      const updated_channels = await channel_update.updateBulk(
        channels_to_update.map((data) => ({
          id: data.channel.id,
          update: data.channel,
        }))
      );
      return [...created_channels, ...updated_channels]; // TODO: Sort by input order?
    }),
});

export const channelRouter = mergeRouters(
  channelFetchRouter,
  channelUpsert,
  channelCreateUpdate,
  channelCreateWithDeps
);
