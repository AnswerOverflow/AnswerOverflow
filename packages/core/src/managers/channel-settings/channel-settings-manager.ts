import { Channel, ChannelSettings, Prisma, Server } from "@prisma/client";
import { ChannelSettingsFlags } from "../../structures/channel-settings";
import { addBitfield, changeFlag, PermissionsBitField } from "../../utils/bitfield";
import { Manager } from "../manager";

export class ChannelSettingsManager extends Manager {
  public async get<T extends Prisma.ChannelSettingsFindUniqueArgs>(
    args: Prisma.SelectSubset<T, Prisma.ChannelSettingsFindUniqueArgs>
  ) {
    const results = await this.answer_overflow_client.prisma.channelSettings.findUnique(args);
    if (results == null) {
      return null;
    }
    return addBitfield(ChannelSettingsFlags, results?.permissions ?? 0, results);
  }

  public async edit(
    channel: Channel,
    server: Server,
    old_settings: ChannelSettings | null,
    new_settings: ChannelSettings
  ) {
    const new_permissions = new PermissionsBitField(ChannelSettingsFlags, new_settings.permissions);
    if (!new_permissions.checkFlag("INDEXING_ENABLED")) {
      new_settings.invite_code = null;
      new_settings.last_indexed_snowflake = null;
    }
    if (!new_permissions.checkFlag("MARK_SOLUTION_ENABLED")) {
      new_permissions.clearFlag("SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS");
    }

    new_settings.permissions = new_permissions.value;
    const updated_settings = await this.answer_overflow_client.prisma.channelSettings.upsert({
      where: {
        channel_id: channel.id,
      },
      create: {
        channel: {
          connectOrCreate: {
            where: {
              id: channel.id,
            },
            create: {
              id: channel.id,
              name: channel.name,
              type: channel.type,
              server: {
                connectOrCreate: {
                  where: {
                    id: server.id,
                  },
                  create: {
                    id: server.id,
                    name: server.name,
                    icon: server.icon,
                  },
                },
              },
            },
          },
        },
        permissions: new_settings.permissions,
        invite_code: new_settings.invite_code,
        solution_tag_id: new_settings.solution_tag_id,
        last_indexed_snowflake: new_settings.last_indexed_snowflake,
      },
      update: {
        permissions: new_settings.permissions,
        invite_code: new_settings.invite_code,
        solution_tag_id: new_settings.solution_tag_id,
        last_indexed_snowflake: new_settings.last_indexed_snowflake,
      },
    });
    return addBitfield(ChannelSettingsFlags, new_settings.permissions, updated_settings);
  }

  private changeChannelSettingsFlag(
    channel: Channel,
    flag: keyof typeof ChannelSettingsFlags,
    active: boolean,
    channel_settings: ChannelSettings | null
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
    return channel_settings;
  }

  public async enableIndexing(
    channel: Channel,
    server: Server,
    invite_code: string,
    old_channel_settings: ChannelSettings | null
  ) {
    const new_channel_settings = this.changeChannelSettingsFlag(
      channel,
      "INDEXING_ENABLED",
      true,
      old_channel_settings
    );
    new_channel_settings.invite_code = invite_code;
    return this.edit(channel, server, old_channel_settings, new_channel_settings);
  }

  public async disableIndexing(
    channel: Channel,
    server: Server,
    old_channel_settings: ChannelSettings | null
  ) {
    const new_channel_settings = this.changeChannelSettingsFlag(
      channel,
      "INDEXING_ENABLED",
      false,
      old_channel_settings
    );
    return this.edit(channel, server, old_channel_settings, new_channel_settings);
  }

  public async setSolvedTagId(
    channel: Channel,
    server: Server,
    old_settings: ChannelSettings | null,
    tag_id: string | null
  ) {
    let new_settings = old_settings;
    if (!new_settings)
      new_settings = {
        channel_id: channel.id,
        permissions: 0,
        invite_code: null,
        last_indexed_snowflake: null,
        solution_tag_id: null,
      };
    new_settings.solution_tag_id = tag_id;
    return this.edit(channel, server, old_settings, new_settings);
  }
}
