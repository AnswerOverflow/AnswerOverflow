import {
  addserverSettingsFlagsToserverSettings,
  bitfieldToserverSettingsFlags,
  ServerSettings,
  server_settings_flags,
  getDefaultServerSettings,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "~api/router/trpc";
import { dictToBitfield } from "@answeroverflow/db";
import { serverRouter, z_server_upsert } from "./server";
import { assertCanEditServer } from "~api/utils/permissions";
import { toZObject } from "~api/utils/zod-utils";
import { TRPCError } from "@trpc/server";
import { upsert } from "~api/utils/operations";

const z_server_settings_flags = toZObject(...server_settings_flags);

const z_server_settings_update = z.object({
  server_id: z.string(),
  flags: z.optional(z_server_settings_flags),
});

const z_server_settings_create = z.object({
  server_id: z.string(),
  flags: z.optional(z_server_settings_flags),
});

const z_server_settings_upsert = z.object({
  create: z_server_settings_create,
  update: z_server_settings_update,
});

function mergeserverSettings(
  old: ServerSettings,
  updated: z.infer<typeof z_server_settings_update>
) {
  const old_flags = bitfieldToserverSettingsFlags(old.bitfield);
  const new_flags = { ...old_flags, ...updated.flags };
  const flags_to_bitfield_value = dictToBitfield(new_flags, server_settings_flags);
  // eslint-disable-next-line no-unused-vars
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags_to_bitfield_value,
  };
}

const serverSettingsCreateUpdate = router({
  create: protectedProcedureWithUserServers
    .input(z_server_settings_create)
    .mutation(async ({ ctx, input }) => {
      const server = await serverRouter.createCaller(ctx).byId(input.server_id);
      if (!server) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "server does not exist",
        });
      }
      assertCanEditServer(ctx, server.id);
      const new_settings = mergeserverSettings(
        getDefaultServerSettings({
          server_id: server.id,
        }),
        input
      );
      const data = await ctx.prisma.serverSettings.create({ data: new_settings });
      return addserverSettingsFlagsToserverSettings(data);
    }),
  update: protectedProcedureWithUserServers
    .input(z_server_settings_update)
    .mutation(async ({ ctx, input }) => {
      const existing_server_settings = await serverSettingFind
        .createCaller(ctx)
        .byId(input.server_id);
      if (!existing_server_settings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "server settings do not exist",
        });
      }
      assertCanEditServer(ctx, existing_server_settings.server_id);
      const new_settings = mergeserverSettings(existing_server_settings, input);
      const data = await ctx.prisma.serverSettings.update({
        where: {
          server_id: input.server_id,
        },
        data: new_settings,
      });
      return addserverSettingsFlagsToserverSettings(data);
    }),
});

const z_server_settings_create_with_deps = z.object({
  server: z_server_upsert,
  settings: z_server_settings_create,
});

const serverSettingsCreateWithDeps = router({
  createWithDeps: protectedProcedureWithUserServers
    .input(z_server_settings_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await serverRouter.createCaller(ctx).upsert(input.server);
      return serverSettingsCreateUpdate.createCaller(ctx).create(input.settings);
    }),
});

const serverSettingFind = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    const data = await ctx.prisma.serverSettings.findUnique({
      where: {
        server_id: input,
      },
    });
    if (!data) return null;
    // TODO: This would work create as a middleware / in some other place but it relies on data from this function
    assertCanEditServer(ctx, data.server_id);
    return addserverSettingsFlagsToserverSettings(data);
  }),
});

const z_server_settings_upsert_with_deps = z.object({
  create: z_server_settings_create_with_deps,
  update: z_server_settings_update,
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
