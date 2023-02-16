import type { z } from "zod";
import {
  prisma,
  getDefaultUserServerSettings,
  UserServerSettings,
  zUserServerSettings,
  getDefaultUserServerSettingsWithFlags,
} from "@answeroverflow/prisma-types";
import { upsertDiscordAccount, zDiscordAccountUpsert } from "./discord-account";
import {
  addFlagsToUserServerSettings,
  mergeUserServerSettingsFlags,
  zUserServerSettingsWithFlags,
} from "@answeroverflow/prisma-types";
import { upsert } from "./utils/operations";

export const zUserServerSettingsRequired = zUserServerSettingsWithFlags.pick({
  userId: true,
  serverId: true,
});

export const zUserServerSettingsMutable = zUserServerSettingsWithFlags
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

export type UserServerSettingsCreateWithDeps = z.infer<typeof zUserServerSettingsCreateWithDeps>;

export const zUserServerSettingsUpdate = zUserServerSettingsMutable.merge(zUserServerSettingsFind);

export async function mergeUserServerSettings<T extends z.infer<typeof zUserServerSettingsMutable>>(
  old: UserServerSettings,
  updated: T
) {
  const { flags, ...updateDataWithoutFlags } = updated;
  const oldFlags = old.bitfield
    ? addFlagsToUserServerSettings(old).flags
    : getDefaultUserServerSettingsWithFlags({
        userId: old.userId,
        serverId: old.serverId,
      }).flags;
  // Disable flags that depend on other flags
  if (flags?.messageIndexingDisabled) {
    flags.canPubliclyDisplayMessages = false;
  }
  if (flags?.messageIndexingDisabled && !oldFlags?.messageIndexingDisabled) {
    await elastic?.deleteByUserIdInServer({
      userId: old.userId,
      serverId: old.serverId,
    });
  }
  const bitfield = flags ? mergeUserServerSettingsFlags(old.bitfield, flags) : undefined;
  return zUserServerSettings.parse({
    ...updateDataWithoutFlags,
    bitfield,
  });
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
  const updateData = await mergeUserServerSettings(
    getDefaultUserServerSettings({
      ...data,
    }),
    data
  );
  const created = await prisma.userServerSettings.create({
    data: updateData,
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
  const updateData = await mergeUserServerSettings(existing, data);
  const updated = await prisma.userServerSettings.update({
    where: {
      userId_serverId: {
        userId: data.userId,
        serverId: data.serverId,
      },
    },
    data: updateData,
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
