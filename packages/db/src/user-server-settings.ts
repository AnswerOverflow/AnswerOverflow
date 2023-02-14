import type { z } from "zod";
import {
  prisma,
  getDefaultUserServerSettings,
  UserServerSettings,
} from "@answeroverflow/prisma-types";
import { upsertDiscordAccount, zDiscordAccountUpsert } from "./discord-account";
import {
  addFlagsToUserServerSettings,
  mergeUserServerSettingsFlags,
  zUserServerSettings,
} from "@answeroverflow/prisma-types";
import { upsert } from "./utils/operations";

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

export function mergeUserServerSettings<T extends z.infer<typeof zUserServerSettingsMutable>>(
  old: UserServerSettings,
  updated: T
) {
  const { flags, ...updateDataWithoutFlags } = updated;
  const sanitizedUpdateData = zUserServerSettingsCreate.parse(updateDataWithoutFlags);
  return {
    ...sanitizedUpdateData,
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
  existing: UserServerSettings | null
) {
  if (!existing) {
    existing = await findUserServerSettingsById({
      userId: data.userId,
      serverId: data.serverId,
    });
  }
  if (!existing) {
    throw new Error("UserServerSettings not found");
  }
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

export async function upsertUserServerSettingsWithDeps(
  data: z.infer<typeof zUserServerSettingsCreateWithDeps>
) {
  return upsert({
    find: () =>
      findUserServerSettingsById({
        userId: data.user.id,
        serverId: data.serverId,
      }),
    create: async () => {
      await upsertDiscordAccount(data.user);
      return createUserServerSettings({
        serverId: data.serverId,
        userId: data.user.id,
        flags: data.flags,
      });
    },
    update: async (existing) => {
      await upsertDiscordAccount(data.user);
      return updateUserServerSettings(
        {
          serverId: data.serverId,
          userId: data.user.id,
          flags: data.flags,
        },
        existing
      );
    },
  });
}
