import { getDefaultServer } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "../trpc";

export const z_server = z.object({
  id: z.string(),
  name: z.string(),
  kicked_time: z.date().nullable(),
});
export const server_create_input = z.object({
  name: z.string(),
  id: z.string(),
  kicked_time: z.date().nullable().optional(),
});
export const server_update_input = z.object({
  name: z.string().optional(),
  kicked_time: z.date().nullable().optional(),
});
export const server_upsert_input = z.object({
  create: server_create_input,
  update: server_update_input,
});

const serverCreateUpdateRouter = router({
  create: publicProcedure.input(server_create_input).mutation(({ ctx, input }) => {
    return ctx.prisma.server.create({ data: input });
  }),
  createBulk: publicProcedure
    .input(z.array(server_create_input))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.server.createMany({ data: input });
      if (result.count !== input.length) {
        throw new TRPCError({
          message: "Failed to create all servers",
          code: "INTERNAL_SERVER_ERROR",
        });
      }
      return input.map((server) =>
        getDefaultServer({
          ...server,
        })
      );
    }),
  update: publicProcedure
    .input(z.object({ old: z_server, data: server_update_input }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.server.update({ where: { id: input.old.id }, data: input.data });
    }),
  updateBulk: publicProcedure
    .input(z.array(z.object({ old: z_server, data: server_update_input })))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.$transaction(
        input.map((server) => {
          return ctx.prisma.server.update({
            where: { id: server.old.id },
            data: server.data,
          });
        })
      );
    }),
});

const serverFetchRouter = router({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.server.findMany();
  }),
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.server.findFirst({ where: { id: input } });
  }),
  byIdMany: publicProcedure.input(z.array(z.string())).query(({ ctx, input }) => {
    return ctx.prisma.server.findMany({ where: { id: { in: input } } });
  }),
});

const serverUpsertRouter = router({
  upsert: publicProcedure.input(server_upsert_input).mutation(async ({ ctx, input }) => {
    const server_fetch = serverFetchRouter.createCaller(ctx);
    const server_update_create = serverCreateUpdateRouter.createCaller(ctx);
    let existing_server = await server_fetch.byId(input.create.id);
    if (existing_server == null) {
      existing_server = await server_update_create.create(input.create);
    }
    return await server_update_create.update({
      old: existing_server,
      data: input.update,
    });
  }),
  upsertBulk: publicProcedure
    .input(z.array(server_upsert_input))
    .mutation(async ({ ctx, input }) => {
      const server_fetch = serverFetchRouter.createCaller(ctx);
      const server_update_create = serverCreateUpdateRouter.createCaller(ctx);

      // 1. Create servers that do not exist yet
      const existing_servers = await server_fetch.byIdMany(input.map((i) => i.create.id));
      const new_servers = input.filter(
        (i) => existing_servers.find((s) => s.id == i.create.id) == null
      );
      const created_new_servers = await server_update_create.createBulk(
        new_servers.map((i) => i.create)
      );

      // 2. Update all servers
      const all_existing_servers = [...existing_servers, ...created_new_servers];
      const existing_servers_loopup = new Map(all_existing_servers.map((s) => [s.id, s]));
      return server_update_create.updateBulk(
        input.map((i) => ({
          old: existing_servers_loopup.get(i.create.id)!,
          data: i.update,
        }))
      );
    }),
});

export const serverRouter = mergeRouters(serverFetchRouter, serverUpsertRouter);
