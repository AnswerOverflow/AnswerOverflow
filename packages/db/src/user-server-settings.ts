import type { z } from "zod";
import {
  prisma,
  getDefaultUserServerSettings,
  UserServerSettings,
} from "@answeroverflow/prisma-types";
import { zDiscordAccountUpsert } from "./discord-account";
import {
  addFlagsToUserServerSettings,
  mergeUserServerSettingsFlags,
  zUserServerSettings,
} from "./zod-schemas";

export const zUserServerSettingsRequired = zUserServerSettings.pick({
  userId: true,
  serverId: true,
});

export const zUserServerSettingsMutable = zUserServerSettings
  .omit({
    userId: true,
    serverId: true,
  })
  .deepPartial();

export const zUserServerSettingsFind = zUserServerSettingsRequired;

export const zUserServerSettingsCreate = zUserServerSettingsMutable.merge(
  zUserServerSettingsRequired
);
export const zUserServerSettingsCreateWithDeps = zUserServerSettingsCreate
  .omit({
    userId: true, // we infer this from the user
  })
  .extend({
    user: zDiscordAccountUpsert,
  });

export const zUserServerSettingsUpdate = zUserServerSettingsMutable.merge(zUserServerSettingsFind);

export type UserServerSettingsWithFlags = Awaited<ReturnType<typeof addFlagsToUserServerSettings>>;

export function mergeUserServerSettings<T extends z.infer<typeof zUserServerSettingsMutable>>(
  old: UserServerSettings,
  updated: T
) {
  const { flags, ...updateDataWithoutFlags } = updated;
  return {
    ...updateDataWithoutFlags,
    bitfield: flags ? mergeUserServerSettingsFlags(old.bitfield, flags) : undefined,
  };
}

interface UserServerSettingsFindById {
  userId: string;
  serverId: string;
}

export async function findUserServerSettingsById(where: UserServerSettingsFindById) {
  const data = await prisma.userServerSettings.findUnique({
    where: {
      userId_serverId: {
        userId: where.userId,
        serverId: where.serverId,
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
        userId: {
          in: where.map((x) => x.userId),
        },
        serverId: {
          in: where.map((x) => x.serverId),
        },
      },
    },
  });
  return data.map(addFlagsToUserServerSettings);
}

export async function createUserServerSettings(data: z.infer<typeof zUserServerSettingsCreate>) {
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
  data: z.infer<typeof zUserServerSettingsUpdate>,
  existing: UserServerSettings
) {
  const updated = await prisma.userServerSettings.update({
    where: {
      userId_serverId: {
        userId: data.userId,
        serverId: data.serverId,
      },
    },
    data: mergeUserServerSettings(existing, data),
  });
  return addFlagsToUserServerSettings(updated);
}
