import { z } from "zod";
import { mergeRouters, router, publicProcedure, withUserServersProcedure } from "~api/router/trpc";
import { upsert } from "~api/utils/operations";
import { canEditServer, canEditServerBotOnly } from "~api/utils/permissions";
import { protectedFetchWithPublicData, protectedMutation } from "~api/utils/protected-procedures";

export const z_server = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  kicked_time: z.date().nullable(),
});

export const z_server_public = z_server.pick({
  id: true,
  name: true,
  icon: true,
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
  create: publicProcedure.input(z_server_create).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => ctx.prisma.server.create({ data: input }),
      permissions: () => canEditServerBotOnly(ctx, input.id),
    });
  }),
  update: publicProcedure.input(z_server_update).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => ctx.prisma.server.update({ where: { id: input.id }, data: input }),
      permissions: () => canEditServerBotOnly(ctx, input.id),
    });
  }),
});

const serverFetchRouter = router({
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => ctx.prisma.server.findUnique({ where: { id: input } }),
      permissions: () => canEditServer(ctx, input),
      not_found_message: "Server not found",
      public_data_formatter: (server) => z_server_public.parse(server),
    });
  }),
});

const serverUpsertRouter = router({
  upsert: publicProcedure.input(z_server_upsert).mutation(async ({ ctx, input }) => {
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
