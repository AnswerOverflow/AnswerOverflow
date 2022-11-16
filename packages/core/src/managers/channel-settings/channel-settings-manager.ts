import { Channel, ChannelSettings, Server } from "@prisma/client";
import { AnswerOverflowClient } from "../../answer-overflow-client";
import {
  ChannelSettingsExtended,
  getDefaultChannelSettings,
} from "../../structures/channel-settings";
import { Manager, UpdateCommand, CreateCommand, GetCommand } from "../manager";

export type ChannelSettingsImmutable = {
  channel_id: string;
};
export type ChannelSettingsUpdateArgs = Partial<Omit<ChannelSettings, "channel_id">>;
export type ChannelSettingsCreateArgs = {
  channel: Channel;
  server: Server;
  settings?: ChannelSettings;
};

export type ChannelSettingsGetArgs = string;
export class ChannelSettingsUpdateCommand extends UpdateCommand<
  ChannelSettings,
  ChannelSettingsExtended,
  ChannelSettingsUpdateArgs
> {
  public async execute(): Promise<ChannelSettingsExtended> {
    const updated_data = await this.answer_overflow_client.prisma.channelSettings.update({
      where: {
        channel_id: this.caller.channel_id,
      },
      data: { ...this.new_data },
    });
    return new ChannelSettingsExtended(updated_data, this.answer_overflow_client.channel_settings);
  }
}

export class ChannelSettingsGetCommand extends GetCommand<
  ChannelSettings,
  ChannelSettingsExtended,
  ChannelSettingsGetArgs
> {
  public getCacheId(): string {
    return this.where;
  }

  public async execute(): Promise<ChannelSettingsExtended | null> {
    const data = await this.answer_overflow_client.prisma.channelSettings.findUnique({
      where: {
        channel_id: this.where,
      },
    });
    if (!data) {
      return null;
    }
    return new ChannelSettingsExtended(data, this.answer_overflow_client.channel_settings);
  }
}

export class ChannelSettingsCreateCommand extends CreateCommand<
  ChannelSettings,
  ChannelSettingsExtended,
  ChannelSettingsCreateArgs
> {
  public getCacheId(): string {
    return this.args.channel.id;
  }
  constructor(answer_overflow_client: AnswerOverflowClient, args: ChannelSettingsCreateArgs) {
    super(answer_overflow_client, args);
  }

  public async execute(): Promise<ChannelSettingsExtended> {
    const { channel, server } = this.args;
    let { settings } = this.args;
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
    return new ChannelSettingsExtended(
      created_settings,
      this.answer_overflow_client.channel_settings
    );
  }
}

export class ChannelSettingsManager extends Manager<
  ChannelSettings,
  ChannelSettingsExtended,
  ChannelSettingsCreateArgs,
  ChannelSettingsUpdateArgs,
  ChannelSettingsGetArgs
> {
  public get(where: ChannelSettingsGetArgs): Promise<ChannelSettingsExtended | null> {
    return this._get(new ChannelSettingsGetCommand(this.answer_overflow_client, where));
  }
  public create(args: ChannelSettingsCreateArgs): Promise<ChannelSettingsExtended> {
    return this._create(new ChannelSettingsCreateCommand(this.answer_overflow_client, args));
  }
  public update(
    target: ChannelSettingsExtended,
    args: ChannelSettingsUpdateArgs
  ): Promise<ChannelSettingsExtended> {
    return this._update(
      new ChannelSettingsUpdateCommand(this.answer_overflow_client, target, args)
    );
  }
}
