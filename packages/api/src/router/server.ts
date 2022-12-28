import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "../trpc";
import { upsert } from "../utils/operations";
import { assertCanEditServer } from "../utils/permissions";

export const z_server = z.object({
  id: z.string(),
  name: z.string(),
  kicked_time: z.date().nullable(),
});
export const z_server_create = z.object({
  name: z.string(),
  id: z.string(),
  kicked_time: z.date().nullable().optional(),
});
export const z_server_update = z.object({
  id: z.string(),
  name: z.string().optional(),
  kicked_time: z.date().nullable().optional(),
});
export const z_server_upsert = z.object({
  create: z_server_create,
  update: z_server_update,
});

const serverCreateUpdateRouter = router({
  create: protectedProcedureWithUserServers.input(z_server_create).mutation(({ ctx, input }) => {
    assertCanEditServer(ctx, input.id);
    return ctx.prisma.server.create({ data: input });
  }),
  update: protectedProcedureWithUserServers.input(z_server_update).mutation(({ ctx, input }) => {
    assertCanEditServer(ctx, input.id);
    return ctx.prisma.server.update({ where: { id: input.id }, data: input });
  }),
});

const serverFetchRouter = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    const server = await ctx.prisma.server.findFirst({ where: { id: input } });
    if (server) {
      assertCanEditServer(ctx, server.id);
    }
    return server;
  }),
});

const serverUpsertRouter = router({
  upsert: protectedProcedureWithUserServers
    .input(z_server_upsert)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => serverFetchRouter.createCaller(ctx).byId(input.create.id),
        () => serverCreateUpdateRouter.createCaller(ctx).create(input.create),
        () => serverCreateUpdateRouter.createCaller(ctx).update(input.update)
      );
    }),
});

export const serverRouter = mergeRouters(
  serverFetchRouter,
  serverUpsertRouter,
  serverCreateUpdateRouter
);
