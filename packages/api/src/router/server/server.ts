import {
  createServer,
  zServerPublic,
  zServerCreate,
  zServerUpdate,
  zServerUpsert,
  updateServer,
  findServerById,
  upsert,
} from "@answeroverflow/db";
import { z } from "zod";
import { MergeRouters, router, publicProcedure, withUserServersProcedure } from "~api/router/trpc";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";
import {
  protectedFetchWithPublicData,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";

const serverCrudRouter = router({
  create: publicProcedure.input(zServerCreate).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => createServer(input),
      permissions: () => assertCanEditServerBotOnly(ctx, input.id),
    });
  }),
  update: publicProcedure.input(zServerUpdate).mutation(({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findServerById(input.id),
      operation: (old) => updateServer(input, old),
      notFoundMessage: "Server not found",
      permissions: () => assertCanEditServerBotOnly(ctx, input.id),
    });
  }),
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findServerById(input),
      permissions: () => assertCanEditServer(ctx, input),
      notFoundMessage: "Server not found",
      publicDataFormatter: (server) => zServerPublic.parse(server),
    });
  }),
});

const serverUpsertRouter = router({
  upsert: publicProcedure.input(zServerUpsert).mutation(async ({ ctx, input }) => {
    return upsert({
      find: () => findServerById(input.id),
      create: () => serverCrudRouter.createCaller(ctx).create(input),
      update: () => serverCrudRouter.createCaller(ctx).update(input),
    });
  }),
});

export const serverRouter = MergeRouters(serverUpsertRouter, serverCrudRouter);
