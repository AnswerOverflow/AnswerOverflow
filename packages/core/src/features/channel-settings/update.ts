import { UpdateUniqueCommand } from "../../primitives/update";
import { ChannelSettings_Extended } from "./channel-settings";
import { Prisma } from "@prisma/client";

export type ChannelSettings_UpdateArgs = Omit<
  Prisma.ChannelSettingsUpdateArgs,
  "select" | "include"
>;

export class ChannelSettings_UpdateUniqueCommand extends UpdateUniqueCommand<
  ChannelSettings_Extended,
  ChannelSettings_UpdateArgs
> {
  protected async update(): Promise<ChannelSettings_Extended> {
    const data = await this.prisma.channelSettings.update(this.query);
    return new ChannelSettings_Extended(data, this.manager);
  }
  protected updateCache(new_value: ChannelSettings_Extended): void {
    this.manager.cache.set(new_value.channel_id, new_value);
  }
}
