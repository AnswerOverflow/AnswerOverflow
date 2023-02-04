import type { z } from "zod";
import { getDefaultServerSettings, PrismaClient, ServerSettings } from "..";
import { z_server_upsert } from "./server";
import {
  addFlagsToServerSettings,
  mergeServerSettingsFlags,
  z_server_settings,
} from "./zod-schemas";

export const z_server_settings_required = z_server_settings.pick({
  server_id: true,
});

export const z_server_settings_mutable = z_server_settings
  .omit({
    server_id: true,
  })
  .partial();

export const z_server_settings_create = z_server_settings_mutable.merge(z_server_settings_required);

export const z_server_settings_update = z_server_settings_mutable.merge(
  z_server_settings.pick({
    server_id: true,
  })
);

export const z_server_settings_upsert = z_server_settings_create;

export const z_server_settings_create_with_deps = z_server_settings_create
  .omit({
    server_id: true, // Taken from server
  })
  .extend({
    server: z_server_upsert,
  });

export const z_server_settings_upsert_with_deps = z_server_settings_create_with_deps;

export function mergeServerSettings<T extends z.infer<typeof z_server_settings_mutable>>(
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

export function findServerSettingsById(server_id: string, prisma: PrismaClient) {
  return prisma.serverSettings.findUnique({
    where: {
      server_id,
    },
  });
}

export function createServerSettings(
  input: z.infer<typeof z_server_settings_create>,
  prisma: PrismaClient
) {
  const new_settings = mergeServerSettings(
    getDefaultServerSettings({
      server_id: input.server_id,
    }),
    input
  );
  return prisma.serverSettings.create({ data: new_settings });
}

export async function updateServerSettings(
  input: z.infer<typeof z_server_settings_update>,
  prisma: PrismaClient,
  existing: ServerSettings | null
) {
  if (!existing) existing = await findServerSettingsById(input.server_id, prisma);
  if (!existing) throw new Error("Server settings not found");
  const new_settings = mergeServerSettings(existing, input);
  return await prisma.serverSettings.update({
    where: {
      server_id: input.server_id,
    },
    data: new_settings,
  });
}
