import { ChannelSettings, Prisma } from "@prisma/client";
import { ChannelSettingsFlags } from "../../structures/channel-settings";
import { changeFlag } from "../../utils/bitfield";
import { Manager } from "../manager";

export class ChannelSettingsManager extends Manager {
  private upsertChannelSettings(
    channel: Prisma.ChannelCreateInput,
    channel_settings: ChannelSettings
  ) {
    return this.answer_overflow_client.prisma.channelSettings.upsert({
      create: {
        channel: {
          connectOrCreate: {
            create: channel,
            where: {
              id: channel.id,
            },
          },
        },
        permissions: channel_settings.permissions,
      },
      update: {
        permissions: channel_settings.permissions,
      },
      where: {
        channel_id: channel.id,
      },
    });
  }
  private changeChannelSettingsFlag(
    channel: Prisma.ChannelCreateInput,
    flag: keyof typeof ChannelSettingsFlags,
    active: boolean,
    channel_settings?: ChannelSettings
  ) {
    const updated_permissions = changeFlag<typeof ChannelSettingsFlags>(
      ChannelSettingsFlags,
      channel_settings?.permissions ?? 0,
      active,
      flag
    );
    if (!channel_settings)
      channel_settings = {
        channel_id: channel.id,
        permissions: updated_permissions.value,
        invite_code: null,
        last_indexed_snowflake: null,
        solution_tag_id: null,
      };
    channel_settings.permissions = updated_permissions.value;
    return this.upsertChannelSettings(channel, channel_settings);
  }

  public async enableIndexing(
    channel: Prisma.ChannelCreateInput,
    invite_code: string,
    channel_settings?: ChannelSettings
  ) {
    return this.changeChannelSettingsFlag(channel, "INDEXING_ENABLED", true, channel_settings);
  }
  public async disableIndexing(
    channel: Prisma.ChannelCreateInput,
    channel_settings?: ChannelSettings
  ) {
    return this.changeChannelSettingsFlag(
      channel,
      "MARK_SOLUTION_ENABLED",
      false,
      channel_settings
    );
  }
  public async enableMarkSolution(
    channel: Prisma.ChannelCreateInput,
    channel_settings?: ChannelSettings
  ) {
    return this.changeChannelSettingsFlag(channel, "MARK_SOLUTION_ENABLED", true, channel_settings);
  }
  public async disableMarkSolution(
    channel: Prisma.ChannelCreateInput,
    channel_settings?: ChannelSettings
  ) {
    return this.changeChannelSettingsFlag(
      channel,
      "MARK_SOLUTION_ENABLED",
      false,
      channel_settings
    );
  }
}
