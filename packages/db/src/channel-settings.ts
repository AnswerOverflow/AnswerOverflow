import {
  ChannelSettings,
  getDefaultChannelSettings,
  PrismaClient,
} from "@answeroverflow/prisma-types";
import type { z } from "zod";
import { z_channel_upsert_with_deps } from "./channel";
import { dictToBitfield } from "./utils/bitfield";
import {
  addFlagsToChannelSettings,
  bitfieldToChannelSettingsFlags,
  channel_settings_flags,
  z_channel_settings,
} from "./zod-schemas";

export const z_channel_settings_required = z_channel_settings.pick({
  channel_id: true,
});

export const z_channel_settings_mutable = z_channel_settings
  .omit({
    channel_id: true,
  })
  .partial();

export const z_channel_settings_create = z_channel_settings_mutable.merge(
  z_channel_settings_required
);

export const z_channel_settings_create_with_deps = z_channel_settings_create
  .omit({
    channel_id: true, // Taken from channel
  })
  .extend({
    channel: z_channel_upsert_with_deps,
  });

export const z_channel_settings_update = z_channel_settings_mutable.merge(
  z_channel_settings.pick({
    channel_id: true,
  })
);

export const z_channel_settings_upsert = z_channel_settings_create;

export const z_channel_settings_upsert_with_deps = z_channel_settings_create_with_deps;

function mergeChannelSettings(
  old: ChannelSettings,
  updated: z.infer<typeof z_channel_settings_mutable>
) {
  const old_flags = bitfieldToChannelSettingsFlags(old.bitfield);
  const new_flags = { ...old_flags, ...updated.flags };
  const flags_to_bitfield_value = dictToBitfield(new_flags, channel_settings_flags);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags_to_bitfield_value,
  };
}

export async function findChannelSettingsById(channel_id: string, prisma: PrismaClient) {
  const settings = await prisma.channelSettings.findUnique({
    where: {
      channel_id,
    },
    include: {
      channel: {
        select: {
          server_id: true,
        },
      },
    },
  });
  if (!settings) return null;
  return addFlagsToChannelSettings(settings);
}

export async function findChannelSettingsByInviteCode(invite_code: string, prisma: PrismaClient) {
  const settings = await prisma.channelSettings.findUnique({
    where: {
      invite_code,
    },
    include: {
      channel: {
        select: {
          server_id: true,
        },
      },
    },
  });
  if (!settings) return null;
  return addFlagsToChannelSettings(settings);
}

export async function createChannelSettings(
  data: z.infer<typeof z_channel_settings_create>,
  prisma: PrismaClient
) {
  const new_settings = mergeChannelSettings(
    getDefaultChannelSettings({
      channel_id: data.channel_id,
    }),
    data
  );
  const created = await prisma.channelSettings.create({
    data: { ...new_settings, channel_id: data.channel_id },
  });
  return addFlagsToChannelSettings(created);
}

export async function updateChannelSettings(
  data: z.infer<typeof z_channel_settings_update>,
  prisma: PrismaClient,
  // The old settings are passed in to avoid an extra database query as they're sometimes avaliable, i.e in the api permission check
  old_settings: ChannelSettings | null = null
) {
  if (!old_settings) old_settings = await findChannelSettingsById(data.channel_id, prisma);
  if (!old_settings) throw new Error("Channel settings not found");
  const new_settings = mergeChannelSettings(old_settings, data);
  const updated = await prisma.channelSettings.update({
    where: {
      channel_id: data.channel_id,
    },
    data: new_settings,
  });
  return addFlagsToChannelSettings(updated);
}
