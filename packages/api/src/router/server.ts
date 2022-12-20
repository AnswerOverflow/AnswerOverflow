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
  update: publicProcedure
    .input(z.object({ old: z_server, data: server_update_input }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.server.update({ where: { id: input.old.id }, data: input.data });
    }),
});

const serverFetchRouter = router({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.server.findMany();
  }),
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.server.findFirst({ where: { id: input } });
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
});

export const serverRouter = mergeRouters(serverFetchRouter, serverUpsertRouter);
