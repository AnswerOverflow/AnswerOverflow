import type { z } from "zod";
import {
  prisma,
  getDefaultUserServerSettings,
  UserServerSettings,
} from "@answeroverflow/prisma-types";
import { z_discord_account_upsert } from "./discord-account";
import {
  addFlagsToUserServerSettings,
  mergeUserServerSettingsFlags,
  z_user_server_settings,
} from "./zod-schemas";

export const z_user_server_settings_required = z_user_server_settings.pick({
  user_id: true,
  server_id: true,
});

export const z_user_server_settings_mutable = z_user_server_settings
  .omit({
    user_id: true,
    server_id: true,
  })
  .partial();

export const z_user_server_settings_find = z_user_server_settings_required;

export const z_user_server_settings_create = z_user_server_settings_mutable.merge(
  z_user_server_settings_required
);
export const z_user_server_settings_create_with_deps = z_user_server_settings_create
  .omit({
    user_id: true, // we infer this from the user
  })
  .extend({
    user: z_discord_account_upsert,
  });

export const z_user_server_settings_update = z_user_server_settings_mutable.merge(
  z_user_server_settings_find
);

export type UserServerSettingsWithFlags = Awaited<ReturnType<typeof addFlagsToUserServerSettings>>;

export function mergeUserServerSettings<T extends z.infer<typeof z_user_server_settings_mutable>>(
  old: UserServerSettings,
  updated: T
) {
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags ? mergeUserServerSettingsFlags(old.bitfield, flags) : undefined,
  };
}

interface UserServerSettingsFindById {
  user_id: string;
  server_id: string;
}

export async function findUserServerSettingsById(where: UserServerSettingsFindById) {
  const data = await prisma.userServerSettings.findUnique({
    where: {
      user_id_server_id: {
        user_id: where.user_id,
        server_id: where.server_id,
      },
    },
  });
  return data ? addFlagsToUserServerSettings(data) : null;
}

export async function findManyUserServerSettings(where: UserServerSettingsFindById[]) {
  // TODO: Maybe just make it only selecting for 1 server at a time
  const data = await prisma.userServerSettings.findMany({
    where: {
      AND: {
        user_id: {
          in: where.map((x) => x.user_id),
        },
        server_id: {
          in: where.map((x) => x.server_id),
        },
      },
    },
  });
  return data.map(addFlagsToUserServerSettings);
}

export async function createUserServerSettings(
  data: z.infer<typeof z_user_server_settings_create>
) {
  const created = await prisma.userServerSettings.create({
    data: mergeUserServerSettings(
      getDefaultUserServerSettings({
        ...data,
      }),
      data
    ),
  });
  return addFlagsToUserServerSettings(created);
}

export async function updateUserServerSettings(
  data: z.infer<typeof z_user_server_settings_update>,
  existing: UserServerSettings
) {
  const updated = await prisma.userServerSettings.update({
    where: {
      user_id_server_id: {
        user_id: data.user_id,
        server_id: data.server_id,
      },
    },
    data: mergeUserServerSettings(existing, data),
  });
  return addFlagsToUserServerSettings(updated);
}
