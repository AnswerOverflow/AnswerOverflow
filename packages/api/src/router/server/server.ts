import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { mergeRouters, withUserServersProcedure, router } from "~api/router/trpc";
import { upsert } from "~api/utils/operations";
import {
  protectedServerManagerFetch,
  protectedServerManagerMutation,
} from "~api/utils/protected-procedures/server-manager-procedures";

export const z_server = z.object({
  id: z.string(),
  name: z.string(),
  kicked_time: z.date().nullable(),
});

const z_server_required = z_server.pick({
  id: true,
  name: true,
});

const z_server_mutable = z_server
  .omit({
    id: true,
  })
  .partial();

const z_server_create = z_server_mutable.merge(z_server_required);

const z_server_update = z_server_mutable.merge(
  z_server_required.pick({
    id: true,
  })
);

export const z_server_upsert = z_server_create;

const serverCreateUpdateRouter = router({
  create: withUserServersProcedure.input(z_server_create).mutation(({ ctx, input }) => {
    return protectedServerManagerMutation({
      ctx,
      server_id: input.id,
      operation: () => ctx.prisma.server.create({ data: input }),
    });
  }),
  update: withUserServersProcedure.input(z_server_update).mutation(({ ctx, input }) => {
    return protectedServerManagerMutation({
      ctx,
      server_id: input.id,
      operation: () => ctx.prisma.server.update({ where: { id: input.id }, data: input }),
    });
  }),
});

const serverFetchRouter = router({
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
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
  upsert: withUserServersProcedure.input(z_server_upsert).mutation(async ({ ctx, input }) => {
    return upsert(
      () => serverFetchRouter.createCaller(ctx).byId(input.id),
      () => serverCreateUpdateRouter.createCaller(ctx).create(input),
      () => serverCreateUpdateRouter.createCaller(ctx).update(input)
    );
  }),
});

export const serverRouter = mergeRouters(
  serverFetchRouter,
  serverUpsertRouter,
  serverCreateUpdateRouter
);
