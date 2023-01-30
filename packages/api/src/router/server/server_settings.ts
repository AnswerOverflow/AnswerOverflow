import {
  addserverSettingsFlagsToserverSettings as addFlagsToServerSettings,
  ServerSettings,
  getDefaultServerSettings,
  mergeServerSettingsFlags,
  PrismaClient,
  z_server_settings,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, withUserServersProcedure, router } from "~api/router/trpc";
import { serverRouter, z_server_upsert } from "./server";
import { findOrThrowNotFound, upsert } from "~api/utils/operations";
import {
  protectedFetch,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";

const z_server_settings_required = z_server_settings.pick({
  server_id: true,
});

const z_server_settings_mutable = z_server_settings
  .omit({
    server_id: true,
  })
  .partial();

const z_server_settings_create = z_server_settings_mutable.merge(z_server_settings_required);

const z_server_settings_update = z_server_settings_mutable.merge(
  z_server_settings.pick({
    server_id: true,
  })
);

const z_server_settings_upsert = z_server_settings_create;

const z_server_settings_create_with_deps = z_server_settings_create
  .omit({
    server_id: true, // Taken from server
  })
  .extend({
    server: z_server_upsert,
  });

const z_server_settings_upsert_with_deps = z_server_settings_create_with_deps;

function mergeServerSettings<T extends z.infer<typeof z_server_settings_mutable>>(
  old: ServerSettings,
  updated: T
) {
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags ? mergeServerSettingsFlags(old.bitfield, flags) : undefined,
  };
}

export async function transformServerSettings<T extends ServerSettings>(
  server_settings: Promise<T>
) {
  return addFlagsToServerSettings(await server_settings);
}

function getServerSettingsById(server_id: string, prisma: PrismaClient, not_found_message: string) {
  return transformServerSettings(
    findOrThrowNotFound(
      () => prisma.serverSettings.findUnique({ where: { server_id } }),
      not_found_message
    )
  );
}

const serverSettingFind = router({
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetch({
      fetch: () => getServerSettingsById(input, ctx.prisma, "Server settings not found"),
      not_found_message: "Server settings not found",
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
    });
  }),
});

const serverSettingsCreateUpdate = router({
  create: withUserServersProcedure
    .input(z_server_settings_create)
    .mutation(async ({ ctx, input }) => {
      return transformServerSettings(
        protectedMutation({
          operation: () => {
            const new_settings = mergeServerSettings(
              getDefaultServerSettings({
                server_id: input.server_id,
              }),
              input
            );
            return ctx.prisma.serverSettings.create({ data: new_settings });
          },
          permissions: () => assertCanEditServerBotOnly(ctx, input.server_id),
        })
      );
    }),
  update: withUserServersProcedure
    .input(z_server_settings_update)
    .mutation(async ({ ctx, input }) => {
      return transformServerSettings(
        protectedMutationFetchFirst({
          fetch: () =>
            getServerSettingsById(input.server_id, ctx.prisma, "Server settings not found"),
          async operation(existing) {
            const new_settings = mergeServerSettings(existing, input);
            return await ctx.prisma.serverSettings.update({
              where: {
                server_id: input.server_id,
              },
              data: new_settings,
            });
          },
          permissions: () => assertCanEditServerBotOnly(ctx, input.server_id),
          not_found_message: "Server settings not found",
        })
      );
    }),
});

const serverSettingsCreateWithDeps = router({
  createWithDeps: withUserServersProcedure
    .input(z_server_settings_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await serverRouter.createCaller(ctx).upsert(input.server);
      return serverSettingsCreateUpdate
        .createCaller(ctx)
        .create({ ...input, server_id: input.server.id });
    }),
});

const serverSettingsUpsert = router({
  upsert: withUserServersProcedure
    .input(z_server_settings_upsert)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => getServerSettingsById(input.server_id, ctx.prisma, "Server settings not found"),
        () => serverSettingsCreateUpdate.createCaller(ctx).create(input),
        () => serverSettingsCreateUpdate.createCaller(ctx).update(input)
      );
    }),
  upsertWithDeps: withUserServersProcedure
    .input(z_server_settings_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => getServerSettingsById(input.server.id, ctx.prisma, "Server settings not found"),
        () => serverSettingsCreateWithDeps.createCaller(ctx).createWithDeps(input),
        () =>
          serverSettingsCreateUpdate
            .createCaller(ctx)
            .update({ server_id: input.server.id, ...input })
      );
    }),
});

export const serverSettingsRouter = mergeRouters(
  serverSettingsUpsert,
  serverSettingFind,
  serverSettingsCreateUpdate,
  serverSettingsCreateWithDeps
);
