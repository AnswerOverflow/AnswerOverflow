import type { Server } from "@answeroverflow/db";
import { inferRouterInputs, TRPCError } from "@trpc/server";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "~api/router/trpc";
import {
  protectedServerManagerFetch,
  protectedServerManagerMutation,
  upsert,
} from "~api/utils/operations";

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

export const z_server_mutable = z_server_create.omit({ id: true }).partial();

export const z_server_update = z.object({ id: z.string(), data: z_server_mutable });

export const z_server_upsert = z.object({
  create: z_server_create,
  update: z_server_update,
});

const serverCreateUpdateRouter = router({
  create: protectedProcedureWithUserServers.input(z_server_create).mutation(({ ctx, input }) => {
    return protectedServerManagerMutation({
      ctx,
      server_id: input.id,
      operation: () => ctx.prisma.server.create({ data: input }),
    });
  }),
  update: protectedProcedureWithUserServers.input(z_server_update).mutation(({ ctx, input }) => {
    return protectedServerManagerMutation({
      ctx,
      server_id: input.id,
      operation: () => ctx.prisma.server.update({ where: { id: input.id }, data: input.data }),
    });
  }),
});

const serverFetchRouter = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    return protectedServerManagerFetch({
      async fetch() {
        const server = await ctx.prisma.server.findUnique({ where: { id: input } });
        if (!server) throw new TRPCError({ code: "NOT_FOUND", message: "Server not found" });
        return server;
      },
      getServerId(data) {
        return data.id;
      },
      ctx,
      not_found_message: "Server not found",
    });
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

export function makeServerUpsert(
  server: Server,
  update: z.infer<typeof z_server_mutable> | undefined = undefined
): inferRouterInputs<typeof serverUpsertRouter>["upsert"] {
  return {
    create: server,
    update: { id: server.id, data: update ?? server },
  };
}
