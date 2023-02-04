import {
  createServerSettings,
  findServerSettingsById,
  updateServerSettings,
  z_server_settings_create,
  z_server_settings_create_with_deps,
  z_server_settings_update,
  z_server_settings_upsert,
  z_server_settings_upsert_with_deps,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, withUserServersProcedure, router } from "~api/router/trpc";
import { serverRouter } from "./server";
import { upsert } from "~api/utils/operations";
import {
  protectedFetch,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";

const server_settings_crud = router({
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetch({
      fetch: () => findServerSettingsById(input, ctx.prisma),
      not_found_message: "Server settings not found",
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
    });
  }),
  create: withUserServersProcedure
    .input(z_server_settings_create)
    .mutation(async ({ ctx, input }) => {
      return protectedMutation({
        operation: () => createServerSettings(input, ctx.prisma),
        permissions: () => assertCanEditServerBotOnly(ctx, input.server_id),
      });
    }),
  update: withUserServersProcedure
    .input(z_server_settings_update)
    .mutation(async ({ ctx, input }) => {
      return protectedMutationFetchFirst({
        fetch: () => findServerSettingsById(input.server_id, ctx.prisma),
        operation: (data) => updateServerSettings(input, ctx.prisma, data),
        permissions: () => assertCanEditServerBotOnly(ctx, input.server_id),
        not_found_message: "Server settings not found",
      });
    }),
});

const server_settings_create_with_deps = router({
  createWithDeps: withUserServersProcedure
    .input(z_server_settings_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await serverRouter.createCaller(ctx).upsert(input.server);
      return server_settings_crud
        .createCaller(ctx)
        .create({ ...input, server_id: input.server.id });
    }),
});

const server_settings_upsert = router({
  upsert: withUserServersProcedure
    .input(z_server_settings_upsert)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => findServerSettingsById(input.server_id, ctx.prisma),
        () => server_settings_crud.createCaller(ctx).create(input),
        () => server_settings_crud.createCaller(ctx).update(input)
      );
    }),
  upsertWithDeps: withUserServersProcedure
    .input(z_server_settings_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => findServerSettingsById(input.server.id, ctx.prisma),
        () => server_settings_create_with_deps.createCaller(ctx).createWithDeps(input),
        () =>
          server_settings_crud.createCaller(ctx).update({ server_id: input.server.id, ...input })
      );
    }),
});

export const serverSettingsRouter = mergeRouters(
  server_settings_upsert,
  server_settings_crud,
  server_settings_create_with_deps
);
