import { z } from "zod";
import { upsertServer, z_server_upsert } from "./server";
import { upsert, upsertMany } from "./utils/operations";
import {
  addFlagsToChannel,
  ALLOWED_THREAD_TYPES,
  bitfieldToChannelFlags,
  channel_bitfield_flags,
  z_channel,
} from "./zod-schemas";
import { prisma, getDefaultChannel, Channel } from "@answeroverflow/prisma-types";
import { omit } from "@answeroverflow/utils";
import { dictToBitfield } from "./utils/bitfield";

export const z_channel_required = z_channel.pick({
  id: true,
  name: true,
  server_id: true,
  type: true,
  parent_id: true,
});

export const z_channel_mutable = z_channel
  .pick({
    name: true,
    flags: true,
    invite_code: true,
    solution_tag_id: true,
    last_indexed_snowflake: true,
  })
  .deepPartial();

export const z_channel_create = z_channel_mutable.merge(z_channel_required);

export const z_channel_upsert = z_channel_create;

export const z_channel_upsert_many = z.array(z_channel_upsert);

export const z_thread_create = z_channel_create.extend({
  parent_id: z.string(),
  type: z.number().refine((n) => ALLOWED_THREAD_TYPES.has(n), "Can only create public threads"), // TODO: Make a type error if possible
});

export const z_channel_create_with_deps = z_channel_create
  .omit({
    server_id: true, // Taken from server
  })
  .extend({
    server: z_server_upsert,
  });

export const z_channel_upsert_with_deps = z_channel_create_with_deps;

export const z_channel_update = z_channel_mutable.merge(
  z_channel_required.pick({
    id: true,
  })
);

// We omit flags because it's too complicated to update many of them
export const z_channel_update_many = z_channel_update
  .omit({
    flags: true,
  })
  .array();

export const z_thread_create_with_deps = z_thread_create
  .omit({
    parent_id: true, // Taken from parent
    server_id: true, // Taken from parent
  })
  .extend({
    parent: z_channel_upsert_with_deps,
  });

export const z_thread_upsert_with_deps = z_thread_create_with_deps;

function combineChannelSettingsFlagsToBitfield<
  T extends { bitfield: number },
  F extends z.infer<typeof z_channel_mutable>
>({ old, updated }: { old: T; updated: F }) {
  const old_flags = bitfieldToChannelFlags(old.bitfield);
  const new_flags = { ...old_flags, ...updated.flags };
  const flags_to_bitfield_value = dictToBitfield(new_flags, channel_bitfield_flags);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags_to_bitfield_value,
  };
}

export function getDefaultChannelWithFlags(
  override: Partial<z.infer<typeof z_channel>> &
    Pick<z.infer<typeof z_channel>, "id" | "server_id" | "type" | "parent_id" | "name">
) {
  return addFlagsToChannel(getDefaultChannel(override));
}

export async function findChannelById(id: string) {
  const data = await prisma.channel.findUnique({ where: { id } });
  if (!data) return null;
  return addFlagsToChannel(data);
}

export async function findChannelByInviteCode(invite_code: string) {
  const data = await prisma.channel.findUnique({ where: { invite_code } });
  if (!data) return null;
  return addFlagsToChannel(data);
}

export async function findManyChannelsById(ids: string[]) {
  const data = await prisma.channel.findMany({ where: { id: { in: ids } } });
  return data.map(addFlagsToChannel);
}

export async function createChannel(data: z.infer<typeof z_channel_create>) {
  const created = await prisma.channel.create({
    data: combineChannelSettingsFlagsToBitfield({
      old: getDefaultChannel(data),
      updated: data,
    }),
  });
  return addFlagsToChannel(created);
}

export async function createManyChannels(data: z.infer<typeof z_channel_create>[]) {
  await prisma.channel.createMany({ data });
  return data.map((c) => getDefaultChannel({ ...c }));
}

export async function updateChannel(data: z.infer<typeof z_channel_update>, old: Channel) {
  const updated = await prisma.channel.update({
    where: { id: data.id },
    data: combineChannelSettingsFlagsToBitfield({
      old,
      updated: data,
    }),
  });
  return addFlagsToChannel(updated);
}

export async function updateManyChannels(data: z.infer<typeof z_channel_update>[]) {
  const updated = await prisma.$transaction(
    data.map((c) => prisma.channel.update({ where: { id: c.id }, data: c }))
  );
  return updated.map(addFlagsToChannel);
}

export function deleteChannel(id: string) {
  return prisma.channel.delete({ where: { id } });
}

export async function createChannelWithDeps(data: z.infer<typeof z_channel_create_with_deps>) {
  await upsertServer(data.server);
  return createChannel({
    server_id: data.server.id,
    ...omit(data, "server"),
  });
}

export function upsertChannel(data: z.infer<typeof z_channel_upsert>) {
  return upsert({
    create: () => createChannel(data),
    update: (old) => updateChannel(data, old),
    find: () => findChannelById(data.id),
  });
}

export function upsertManyChannels(data: z.infer<typeof z_channel_upsert_many>) {
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
