import { Prisma } from "@prisma/client";
import { GetUniqueCommand, GetManyCommand } from "../../primitives/find";
import { ChannelSettings_Extended } from "./channel-settings";

export type ChannelSettings_GetArgs = Prisma.ChannelSettingsWhereUniqueInput;
export type ChannelSettings_FindManyArgs = Prisma.ChannelSettingsWhereInput;

export class ChannelSettings_GetUniqueCommand extends GetUniqueCommand<
  ChannelSettings_Extended,
  ChannelSettings_GetArgs
> {
  protected getFromCache(): ChannelSettings_Extended | null {
    if (this.query.channel_id) {
      const data = this.cache.get(this.query.channel_id);
      return data;
    }
    return null;
  }
  protected async fetch(): Promise<ChannelSettings_Extended | null> {
    const data = await this.manager.answer_overflow_client.prisma.channelSettings.findUnique({
      where: this.query,
    });
    if (data == null) {
      return null;
    }
    return new ChannelSettings_Extended(data, this.manager);
  }
  protected updateCache(new_value: ChannelSettings_Extended): void {
    const cached_data = this.getFromCache();
    if (cached_data == null) {
      this.manager.cache.set(new_value.channel_id, new_value);
    } else {
      cached_data.updateCacheEntry(new_value.data);
    }
  }
}

export class ChannelSettings_FindManyCommand extends GetManyCommand<
  ChannelSettings_Extended,
  ChannelSettings_FindManyArgs
> {
  protected getFromCache(): ChannelSettings_Extended[] {
    if (this.query.channel_id instanceof Object) {
      const ids = this.query.channel_id.in;
      if (ids && ids instanceof Array<string>) {
        const data = ids.map((channel_id) => this.cache.get(channel_id));
        const filtered = data.filter((x): x is ChannelSettings_Extended => x != null);
        return filtered;
      }
    }
    return [];
  }
  protected async fetch(): Promise<ChannelSettings_Extended[] | null> {
    const fetched_data = await this.manager.answer_overflow_client.prisma.channelSettings.findMany({
      where: this.query,
    });
    const converted_fetched_data = fetched_data.map(
      (x) => new ChannelSettings_Extended(x, this.manager)
    );
    return converted_fetched_data;
  }

  protected updateCache(new_value: ChannelSettings_Extended[]): void {
    const cached_data = this.getFromCache();
    const cached_ids = new Set(cached_data.map((x) => x.data.channel_id));
    new_value.forEach((x) => {
      if (!cached_ids.has(x.data.channel_id)) {
        this.manager.cache.set(x.channel_id, x);
      } else {
        const cached = cached_data.find((y) => y.data.channel_id === x.data.channel_id);
        if (cached != null) {
          cached.updateCacheEntry(x.data);
        }
      }
    });
  }
}
