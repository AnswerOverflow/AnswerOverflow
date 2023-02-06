import { z } from "zod";
import { upsertServer, z_server_upsert } from "./server";
import { upsert, upsertMany } from "./utils/operations";
import { addFlagsToChannelSettings, ALLOWED_THREAD_TYPES, z_channel } from "./zod-schemas";
import {
  Prisma,
  Channel,
  ChannelSettings,
  getDefaultChannelSettings,
  prisma,
  getDefaultChannel,
} from "@answeroverflow/prisma-types";
import { omit } from "@answeroverflow/utils";

export const z_channel_required = z_channel.pick({
  id: true,
  name: true,
  server_id: true,
  type: true,
  parent_id: true,
});

export const z_channel_mutable = z_channel.pick({
  name: true,
});

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

export const z_thread_create_with_deps = z_thread_create
  .omit({
    parent_id: true, // Taken from parent
    server_id: true, // Taken from parent
  })
  .extend({
    parent: z_channel_upsert_with_deps,
  });

export const z_thread_upsert_with_deps = z_thread_create_with_deps;

function addSettingsToChannel<
  T extends Channel & {
    channel_settings: ChannelSettings | null;
  }
>(channel: T) {
  return {
    ...channel,
    settings: addFlagsToChannelSettings(
      channel.channel_settings ?? getDefaultChannelSettings({ channel_id: channel.id })
    ),
  };
}

export function findChannel<T extends Prisma.ChannelFindUniqueArgs>(
  args: Prisma.SelectSubset<T, Prisma.ChannelFindUniqueArgs>
) {
  return prisma.channel.findUnique(args);
}

export async function findChannelById(id: string) {
  return findChannel({ where: { id } });
}

export async function findChannelByIdWithSettings(id: string) {
  const channel = await findChannel({
    where: { id },
    include: { channel_settings: true },
  });
  if (!channel) return null;
  return addSettingsToChannel(channel);
}

export function findManyChannels<T extends Prisma.ChannelFindManyArgs>(
  args: Prisma.SelectSubset<T, Prisma.ChannelFindManyArgs>
) {
  return prisma.channel.findMany(args);
}

export function findManyChannelsById(ids: string[]) {
  return findManyChannels({ where: { id: { in: ids } } });
}

export function createChannel(data: z.infer<typeof z_channel_create>) {
  return prisma.channel.create({ data });
}

export async function createManyChannels(data: z.infer<typeof z_channel_create>[]) {
  await prisma.channel.createMany({ data });
  return data.map((c) => getDefaultChannel({ ...c }));
}

export function updateChannel(data: z.infer<typeof z_channel_update>) {
  return prisma.channel.update({ where: { id: data.id }, data });
}

export function updateManyChannels(data: z.infer<typeof z_channel_update>[]) {
  return prisma.$transaction(
    data.map((c) => prisma.channel.update({ where: { id: c.id }, data: c }))
  );
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
    update: () => updateChannel(data),
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
