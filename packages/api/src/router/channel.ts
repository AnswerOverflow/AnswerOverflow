import { getDefaultChannel } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "../trpc";
import { upsert, upsertMany } from "../utils/operations";
import { assertCanEditServer } from "../utils/permissions";
import { ALLOWED_CHANNEL_TYPES } from "../utils/types";
import { serverRouter, z_server_upsert } from "./server";

const z_channel_create = z.object({
  id: z.string(),
  name: z.string(),
  server_id: z.string(),
  type: z
    .number()
    .refine(
      (n) => ALLOWED_CHANNEL_TYPES.has(n),
      "Channel type can only be guild forum, text, or announcement"
    ), // TODO: Make a type error if possible
});

const z_channel_create_with_deps = z.object({
  channel: z_channel_create,
  server: z_server_upsert,
});

const z_channel_update = z.object({
  id: z.string(),
  name: z.string().optional(),
});

const channelCreateUpdateRouter = router({
  create: protectedProcedureWithUserServers.input(z_channel_create).mutation(({ ctx, input }) => {
    assertCanEditServer(ctx, input.server_id);
    return ctx.prisma.channel.create({ data: input });
  }),
  createMany: protectedProcedureWithUserServers
    .input(z.array(z_channel_create))
    .mutation(async ({ ctx, input }) => {
      const server_ids = input.map((c) => c.server_id);
      server_ids.forEach((id) => assertCanEditServer(ctx, id));
      await ctx.prisma.channel.createMany({ data: input, skipDuplicates: true });
      return input.map((c) =>
        getDefaultChannel({
          ...c,
        })
      );
    }),
  update: protectedProcedureWithUserServers
    .input(z_channel_update)
    .mutation(async ({ ctx, input }) => {
      const existing_channel = await channelFetchRouter.createCaller(ctx).byId(input.id);
      if (!existing_channel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Channel does not exist",
        });
      }
      assertCanEditServer(ctx, existing_channel.server_id); // technically covered byId but doesnt hurt to have here
      return ctx.prisma.channel.update({ where: { id: input.id }, data: input });
    }),
  updateMany: protectedProcedureWithUserServers
    .input(z.array(z_channel_update))
    .mutation(async ({ ctx, input }) => {
      const existing_channels = await channelFetchRouter
        .createCaller(ctx)
        .byIdMany(input.map((c) => c.id));
      const server_ids = existing_channels.map((c) => c.server_id);
      server_ids.forEach((id) => assertCanEditServer(ctx, id));
      return ctx.prisma.$transaction(
        input.map((c) => ctx.prisma.channel.update({ where: { id: c.id }, data: c }))
      );
    }),
});

const channelCreateWithDepsRouter = router({
  createWithDeps: protectedProcedureWithUserServers
    .input(z_channel_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await serverRouter.createCaller(ctx).upsert(input.server);
      return await channelCreateUpdateRouter.createCaller(ctx).create(input.channel);
    }),
});

const channelFetchRouter = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    const channel = await ctx.prisma.channel.findFirst({ where: { id: input } });
    if (channel) {
      assertCanEditServer(ctx, channel.server_id);
    }
    return channel;
  }),
  byIdMany: protectedProcedureWithUserServers
    .input(z.array(z.string()))
    .query(async ({ ctx, input }) => {
      const channels = await ctx.prisma.channel.findMany({ where: { id: { in: input } } });
      channels.forEach((channel) => assertCanEditServer(ctx, channel.server_id));
      return channels;
    }),
});

export const z_channel_upsert = z.object({ create: z_channel_create, update: z_channel_update });
export const z_channel_upsert_many = z.array(z_channel_upsert);
export const z_channel_upsert_with_deps = z.object({
  create: z_channel_create_with_deps,
  update: z_channel_update,
});

const channelUpsertRouter = router({
  upsert: protectedProcedureWithUserServers
    .input(z_channel_upsert)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => channelFetchRouter.createCaller(ctx).byId(input.create.id),
        () => channelCreateUpdateRouter.createCaller(ctx).create(input.create),
        () => channelCreateUpdateRouter.createCaller(ctx).update(input.update)
      );
    }),
  upsertMany: protectedProcedureWithUserServers
    .input(z_channel_upsert_many)
    .mutation(async ({ ctx, input }) => {
      return upsertMany({
        find: () => channelFetchRouter.createCaller(ctx).byIdMany(input.map((c) => c.create.id)),
        getToCreate: (existing) =>
          input.map((c) => c.create).filter((c) => !existing.map((e) => e.id).includes(c.id)),
        getToUpdate: (existing) =>
          input.map((c) => c.update).filter((c) => existing.map((e) => e.id).includes(c.id)),
        create: (create) => channelCreateUpdateRouter.createCaller(ctx).createMany(create),
        update: (update) => channelCreateUpdateRouter.createCaller(ctx).updateMany(update),
      });
    }),

  upsertWithDeps: protectedProcedureWithUserServers
    .input(z_channel_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => channelFetchRouter.createCaller(ctx).byId(input.create.channel.id),
        () => channelCreateWithDepsRouter.createCaller(ctx).createWithDeps(input.create),
        () => channelCreateUpdateRouter.createCaller(ctx).update(input.update)
      );
    }),
});

export const channelRouter = mergeRouters(
  channelCreateUpdateRouter,
  channelCreateWithDepsRouter,
  channelFetchRouter,
  channelUpsertRouter
);
