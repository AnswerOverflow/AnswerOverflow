import { Channel, ChannelSettings, Server } from "@prisma/client";
import {
  EditableChannelSettings,
  getDefaultChannelSettings,
} from "../../structures/channel-settings";
import { Manager } from "../manager";

export class ChannelSettingsManager extends Manager<ChannelSettings> {
  public async edit(data: ChannelSettings): Promise<EditableChannelSettings> {
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
    const cached_data = this.cache.get(data.channel_id);
    if (cached_data) {
      cached_data.data = updated_data;
    } else {
      this.cache.set(data.channel_id, new EditableChannelSettings(updated_data, this));
    }
    return new EditableChannelSettings(updated_data, this);
  }
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
}
