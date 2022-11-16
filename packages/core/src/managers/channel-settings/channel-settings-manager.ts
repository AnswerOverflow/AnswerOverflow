import { Channel, ChannelSettings, Server } from "@prisma/client";
import {
  ChannelSettingsExtended,
  getDefaultChannelSettings,
} from "../../structures/channel-settings";
import { Manager } from "../manager";

export type ChannelSettingsCreateArgs = {
  channel: Channel;
  server: Server;
  settings?: ChannelSettings;
};

export type ChannelSettingsImmutable = {
  channel_id: string;
};
export type ChannelSettingsUpdateArgs = Partial<Omit<ChannelSettings, "channel_id">>;
export class ChannelSettingsManager extends Manager<
  ChannelSettings,
  ChannelSettingsExtended,
  ChannelSettingsCreateArgs,
  ChannelSettingsUpdateArgs
> {
  public async update(
    current: ChannelSettingsExtended,
    data: ChannelSettingsUpdateArgs
  ): Promise<ChannelSettingsExtended> {
    const updated_data = await this.answer_overflow_client.prisma.channelSettings.update({
      where: {
        channel_id: current.channel_id,
      },
      data,
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

  public async create(args: ChannelSettingsCreateArgs) {
    const { channel, server } = args;
    let { settings } = args;
    if (!settings) {
      settings = getDefaultChannelSettings(channel.id);
    }
    const created_settings = await this.answer_overflow_client.prisma.channelSettings.create({
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
    return new ChannelSettingsExtended(created_settings, this);
  }
}
