import { Channel, ChannelSettings, Server } from "@prisma/client";
import {
  ChannelSettingsExtended,
  getDefaultChannelSettings,
} from "../../structures/channel-settings";
import { Manager } from "../manager";

export class ChannelSettingsManager extends Manager<ChannelSettings, ChannelSettingsExtended> {
  public async edit(data: ChannelSettings): Promise<ChannelSettingsExtended> {
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
    const updated_entry = new ChannelSettingsExtended(updated_data, this);
    return this.updateCache(updated_entry);
  }

  public async get(channel_id: string): Promise<ChannelSettingsExtended | null> {
    const cached = this.cache.get(channel_id);
    if (cached) {
      return cached;
    }

    const results = await this.answer_overflow_client.prisma.channelSettings.findUnique({
      where: { channel_id },
    });

    if (results == null) {
      return null;
    }

    const editable_channel_settings = new ChannelSettingsExtended(results, this);
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
