import { z } from "zod";
import { upsertServer, zServerUpsert } from "./server";
import { upsert, upsertMany } from "./utils/operations";
import {
  addFlagsToChannel,
  ALLOWED_THREAD_TYPES,
  bitfieldToChannelFlags,
  channelBitfieldFlags,
  zChannel,
} from "@answeroverflow/prisma-types";
import { prisma, getDefaultChannel, Channel } from "@answeroverflow/prisma-types";
import { dictToBitfield } from "@answeroverflow/prisma-types/src/bitfield";

export const zChannelRequired = zChannel.pick({
  id: true,
  name: true,
  serverId: true,
  type: true,
  parentId: true,
});

export const zChannelMutable = zChannel
  .pick({
    name: true,
    flags: true,
    inviteCode: true,
    solutionTagId: true,
    lastIndexedSnowflake: true,
  })
  .deepPartial();

export const zChannelCreate = zChannelMutable.merge(zChannelRequired);

export const zChannelCreateMany = zChannelCreate.omit({
  flags: true,
});

export const zChannelUpsert = zChannelCreate;

export const zChannelUpsertMany = zChannelCreateMany;

export const zThreadCreate = zChannelCreate.extend({
  parentId: z.string(),
  type: z.number().refine((n) => ALLOWED_THREAD_TYPES.has(n), "Can only create public threads"), // TODO: Make a type error if possible
});

export const zChannelCreateWithDeps = zChannelCreate
  .omit({
    serverId: true, // Taken from server
  })
  .extend({
    server: zServerUpsert,
  });

export const zChannelUpsertWithDeps = zChannelCreateWithDeps;

export const zChannelUpdate = zChannelMutable.merge(
  zChannelRequired.pick({
    id: true,
  })
);

// We omit flags because it's too complicated to update many of them
export const zChannelUpdateMany = zChannelUpdate.omit({
  flags: true,
});

export const zThreadCreateWithDeps = zThreadCreate
  .omit({
    parentId: true, // Taken from parent
    serverId: true, // Taken from parent
  })
  .extend({
    parent: zChannelUpsertWithDeps,
  });

export const zThreadUpsertWithDeps = zThreadCreateWithDeps;

function combineChannelSettingsFlagsToBitfield<
  T extends { bitfield: number },
  F extends z.infer<typeof zChannelMutable>
>({ old, updated }: { old: T; updated: F }) {
  const oldFlags = bitfieldToChannelFlags(old.bitfield);
  const newFlags = { ...oldFlags, ...updated.flags };
  const flagsToBitfieldValue = dictToBitfield(newFlags, channelBitfieldFlags);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { flags, ...updateDataWithoutFlags } = updated;
  const sanitzedUpdateData = zChannelCreate.parse(updateDataWithoutFlags);
  return {
    ...sanitzedUpdateData,
    bitfield: flagsToBitfieldValue,
  };
}

export async function findChannelById(id: string) {
  const data = await prisma.channel.findUnique({ where: { id } });
  if (!data) return null;
  return addFlagsToChannel(data);
}

export async function findChannelByInviteCode(inviteCode: string) {
  const data = await prisma.channel.findUnique({ where: { inviteCode } });
  if (!data) return null;
  return addFlagsToChannel(data);
}

export async function findManyChannelsById(ids: string[]) {
  const data = await prisma.channel.findMany({ where: { id: { in: ids } } });
  return data.map(addFlagsToChannel);
}

export async function createChannel(data: z.infer<typeof zChannelCreate>) {
  const created = await prisma.channel.create({
    data: combineChannelSettingsFlagsToBitfield({
      old: getDefaultChannel(data),
      updated: data,
    }),
  });
  return addFlagsToChannel(created);
}

export async function createManyChannels(data: z.infer<typeof zChannelCreateMany>[]) {
  await prisma.channel.createMany({
    data: data.map((c) => zChannelCreateMany.parse(c)),
  });
  return data.map((c) => getDefaultChannel({ ...c }));
}

export async function updateChannel(data: z.infer<typeof zChannelUpdate>, old: Channel | null) {
  if (!old) old = await findChannelById(data.id);
  if (!old) throw new Error("Channel not found");
  const updated = await prisma.channel.update({
    where: { id: data.id },
    data: combineChannelSettingsFlagsToBitfield({
      old,
      updated: data,
    }),
  });
  return addFlagsToChannel(updated);
}

export async function updateManyChannels(data: z.infer<typeof zChannelUpdateMany>[]) {
  const updated = await prisma.$transaction(
    data.map((c) =>
      prisma.channel.update({
        where: { id: c.id },
        data: zChannelUpdateMany.parse(c),
      })
    )
  );
  return updated.map(addFlagsToChannel);
}

export function deleteChannel(id: string) {
  return prisma.channel.delete({ where: { id } });
}

export async function createChannelWithDeps(data: z.infer<typeof zChannelCreateWithDeps>) {
  await upsertServer(data.server);
  return createChannel({
    serverId: data.server.id,
    ...data,
  });
}

export function upsertChannel(data: z.infer<typeof zChannelUpsert>) {
  return upsert({
    create: () => createChannel(data),
    update: (old) => updateChannel(data, old),
    find: () => findChannelById(data.id),
  });
}

export function upsertManyChannels(data: z.infer<typeof zChannelUpsertMany>[]) {
  return upsertMany({
    input: data,
    find: () => findManyChannelsById(data.map((c) => c.id)),
    getInputId(input) {
      return input.id;
    },
    getFetchedDataId(input) {
      return input.id;
    },
    create: (create) => createManyChannels(create),
    update: (update) => updateManyChannels(update),
  });
}
