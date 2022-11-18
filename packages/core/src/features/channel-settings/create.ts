import { ChannelSettings } from "@prisma/client";
import { CreateUniqueCommand } from "../../primitives/create";
import { ChannelSettings_Extended } from "./channel-settings";

export type ChannelSettings_CreateArgs = Pick<ChannelSettings, "channel_id"> &
  Partial<ChannelSettings>;

export class ChannelSettings_CreateCommand extends CreateUniqueCommand<
  ChannelSettings_Extended,
  ChannelSettings_CreateArgs
> {
  protected async create(): Promise<ChannelSettings_Extended> {
    const data = await this.prisma.channelSettings.create({
      data: this.query,
    });
    return new ChannelSettings_Extended(data, this.manager);
  }
  protected updateCache(new_value: ChannelSettings_Extended): void {
    this.manager.cache.set(new_value.channel_id, new_value);
  }
}
