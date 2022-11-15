import { Channel, ChannelSettings, Server } from "@prisma/client";
import {
  ChannelSettingsFlags,
  EditableChannelSettings,
  getDefaultChannelSettings,
} from "../../structures/channel-settings";
import { PermissionsBitField } from "../../utils/bitfield";
import { Manager } from "../manager";

export class ChannelSettingsManager extends Manager {
  public readonly cache = new Map<string, EditableChannelSettings>();
  public async get(channel_id: string): Promise<EditableChannelSettings | null> {
    const cached = this.cache.get(channel_id);
    if (cached) return cached;

    const results = await this.answer_overflow_client.prisma.channelSettings.findUnique({
      where: { channel_id },
    });
    if (results == null) {
      return null;
    }
    const editable_channel_settings = new EditableChannelSettings(results, this);
    this.cache.set(channel_id, editable_channel_settings);
    return editable_channel_settings;
  }

  public async create(channel: Channel, server: Server, settings?: ChannelSettings) {
    if (!settings) {
      settings = getDefaultChannelSettings(channel.id);
    }

    return await this.answer_overflow_client.prisma.channelSettings.create({
      data: {
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
        permissions: settings.permissions,
        invite_code: settings.invite_code,
        solution_tag_id: settings.solution_tag_id,
        last_indexed_snowflake: settings.last_indexed_snowflake,
      },
    });
  }

  public async edit(
    settings: EditableChannelSettings,
    data: ChannelSettings
  ): Promise<EditableChannelSettings> {
    if (!settings.indexing_enabled) {
      data.invite_code = null;
      data.last_indexed_snowflake = null;
    }
    if (!settings.mark_solution_enabled) {
      data.permissions = new PermissionsBitField(ChannelSettingsFlags, data.permissions).setFlag(
        "SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS"
      ).value;
    }

    const updated_data = await this.answer_overflow_client.prisma.channelSettings.update({
      where: {
        channel_id: data.channel_id,
      },
      data: {
        permissions: data.permissions,
        invite_code: data.invite_code,
        solution_tag_id: data.solution_tag_id,
        last_indexed_snowflake: data.last_indexed_snowflake,
      },
    });
    return new EditableChannelSettings(updated_data, this);
  }
}
