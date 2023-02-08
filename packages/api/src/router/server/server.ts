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
import {
  MergeRouters,
  router,
  public_procedure,
  with_user_servers_procedure,
} from "~api/router/trpc";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";
import {
  protectedFetchWithPublicData,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";

const server_crud_router = router({
  create: public_procedure.input(z_server_create).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => createServer(input),
      permissions: () => assertCanEditServerBotOnly(ctx, input.id),
    });
  }),
  update: public_procedure.input(z_server_update).mutation(({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findServerById(input.id),
      operation: (old) => updateServer(input, old),
      not_found_message: "Server not found",
      permissions: () => assertCanEditServerBotOnly(ctx, input.id),
    });
  }),
  byId: with_user_servers_procedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findServerById(input),
      permissions: () => assertCanEditServer(ctx, input),
      not_found_message: "Server not found",
      public_data_formatter: (server) => z_server_public.parse(server),
    });
  }),
});

const server_upsert_router = router({
  upsert: public_procedure.input(z_server_upsert).mutation(async ({ ctx, input }) => {
    return upsert({
      find: () => findServerById(input.id),
      create: () => server_crud_router.createCaller(ctx).create(input),
      update: () => server_crud_router.createCaller(ctx).update(input),
    });
  }),
});

export const server_router = MergeRouters(server_upsert_router, server_crud_router);
