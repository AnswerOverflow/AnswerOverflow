import {
  addserverSettingsFlagsToserverSettings as addFlagsToServerSettings,
  ServerSettings,
  server_settings_flags,
  getDefaultServerSettings,
  mergeServerSettingsFlags,
  Server,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "~api/router/trpc";
import { makeServerUpsert, serverRouter, z_server_upsert } from "./server";
import { toZObject } from "~api/utils/zod-utils";
import { upsert } from "~api/utils/operations";

import {
  protectedServerManagerFetch,
  protectedServerManagerMutation,
  protectedServerManagerMutationFetchFirst,
} from "~api/utils/protected-procedures/server-manager-procedures";
import type { inferRouterInputs } from "@trpc/server";

const z_server_settings_flags = toZObject(...server_settings_flags);

const z_server_settings_create = z.object({
  server_id: z.string(),
  flags: z.optional(z_server_settings_flags),
});

const z_server_settings_mutable = z_server_settings_create.extend({}).partial().omit({
  server_id: true,
});

const z_server_settings_update = z.object({
  server_id: z.string(),
  data: z_server_settings_mutable,
});

const z_server_settings_upsert = z.object({
  create: z_server_settings_create,
  update: z_server_settings_update,
});

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

const serverSettingFind = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    return transformServerSettings(
      protectedServerManagerFetch({
        fetch: () => ctx.prisma.serverSettings.findUnique({ where: { server_id: input } }),
        getServerId(data) {
          return data.server_id;
        },
        ctx,
        not_found_message: "Server settings not found",
      })
    );
  }),
});

const serverSettingsCreateUpdate = router({
  create: protectedProcedureWithUserServers
    .input(z_server_settings_create)
    .mutation(async ({ ctx, input }) => {
      return transformServerSettings(
        protectedServerManagerMutation({
          ctx,
          server_id: input.server_id,
          operation: () => {
            const new_settings = mergeServerSettings(
              getDefaultServerSettings({
                server_id: input.server_id,
              }),
              input
            );
            return ctx.prisma.serverSettings.create({ data: new_settings });
          },
        })
      );
    }),
  update: protectedProcedureWithUserServers
    .input(z_server_settings_update)
    .mutation(async ({ ctx, input }) => {
      return transformServerSettings(
        protectedServerManagerMutationFetchFirst({
          ctx,
          fetch: () => serverSettingFind.createCaller(ctx).byId(input.server_id),
          getServerId(data) {
            return data.server_id;
          },
          async operation(existing) {
            const new_settings = mergeServerSettings(existing, input.data);
            return await ctx.prisma.serverSettings.update({
              where: {
                server_id: input.server_id,
              },
              data: new_settings,
            });
          },
          not_found_message: "Server settings not found",
        })
      );
    }),
});

const z_server_settings_create_with_deps = z.object({
  server: z_server_upsert,
  settings: z_server_settings_create,
});

const z_server_settings_upsert_with_deps = z.object({
  create: z_server_settings_create_with_deps,
  update: z_server_settings_update,
});

const serverSettingsCreateWithDeps = router({
  createWithDeps: protectedProcedureWithUserServers
    .input(z_server_settings_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await serverRouter.createCaller(ctx).upsert(input.server);
      return serverSettingsCreateUpdate.createCaller(ctx).create(input.settings);
    }),
});

const serverSettingsUpsert = router({
  upsert: protectedProcedureWithUserServers
    .input(z_server_settings_upsert)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => serverSettingFind.createCaller(ctx).byId(input.create.server_id),
        () => serverSettingsCreateUpdate.createCaller(ctx).create(input.create),
        () => serverSettingsCreateUpdate.createCaller(ctx).update(input.update)
      );
    }),
  upsertWithDeps: protectedProcedureWithUserServers
    .input(z_server_settings_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => serverSettingFind.createCaller(ctx).byId(input.create.settings.server_id),
        () => serverSettingsCreateWithDeps.createCaller(ctx).createWithDeps(input.create),
        () => serverSettingsCreateUpdate.createCaller(ctx).update(input.update)
      );
    }),
});

export const serverSettingsRouter = mergeRouters(
  serverSettingsUpsert,
  serverSettingFind,
  serverSettingsCreateUpdate,
  serverSettingsCreateWithDeps
);

export function makeServerSettingsCreateWithDepsInput(
  server: Server,
  settings: z.infer<typeof z_server_settings_mutable> = {}
): inferRouterInputs<typeof serverSettingsCreateWithDeps>["createWithDeps"] {
  return {
    server: makeServerUpsert(server),
    settings: {
      server_id: server.id,
      ...settings,
    },
  };
}

export function makeServerSettingsUpsertInput(
  server: Server,
  settings: z.infer<typeof z_server_settings_mutable>
): inferRouterInputs<typeof serverSettingsUpsert>["upsert"] {
  return {
    create: {
      server_id: server.id,
      ...settings,
    },
    update: {
      server_id: server.id,
      data: settings,
    },
  };
}
