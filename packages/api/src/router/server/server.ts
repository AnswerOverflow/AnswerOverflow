import {
  createServer,
  z_server_public,
  z_server_create,
  z_server_update,
  z_server_upsert,
  updateServer,
  findServerById,
  upsert,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, router, publicProcedure, withUserServersProcedure } from "~api/router/trpc";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";
import {
  protectedFetchWithPublicData,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";

const serverCreateUpdateRouter = router({
  create: publicProcedure.input(z_server_create).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => createServer(input),
      permissions: () => assertCanEditServerBotOnly(ctx, input.id),
    });
  }),
  update: publicProcedure.input(z_server_update).mutation(({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findServerById(input.id),
      operation: (old) => updateServer(input, old),
      not_found_message: "Server not found",
      permissions: () => assertCanEditServerBotOnly(ctx, input.id),
    });
  }),
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findServerById(input),
      permissions: () => assertCanEditServer(ctx, input),
      not_found_message: "Server not found",
      public_data_formatter: (server) => z_server_public.parse(server),
    });
  }),
});

const serverUpsertRouter = router({
  upsert: publicProcedure.input(z_server_upsert).mutation(async ({ ctx, input }) => {
    return upsert({
      find: () => findServerById(input.id),
      create: () => serverCreateUpdateRouter.createCaller(ctx).create(input),
      update: () => serverCreateUpdateRouter.createCaller(ctx).update(input),
    });
  }),
});

export const serverRouter = mergeRouters(serverUpsertRouter, serverCreateUpdateRouter);
