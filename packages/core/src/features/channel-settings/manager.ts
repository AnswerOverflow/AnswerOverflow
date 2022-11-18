import { Prisma } from "@prisma/client";
import { Manager } from "../../primitives/manager";
import { ChannelSettings_Extended } from "./channel-settings";

export type ChannelSettings_CreateArgs = Prisma.ChannelSettingsCreateArgs;
export type ChannelSettings_CreateManyArgs = Prisma.ChannelSettingsCreateManyArgs;
export type ChannelSettings_DeleteArgs = Prisma.ChannelSettingsDeleteArgs;
export type ChannelSettings_DeleteManyArgs = Prisma.ChannelSettingsDeleteManyArgs;
export type ChannelSettings_FindManyArgs = Prisma.ChannelSettingsFindManyArgs;
export type ChannelSettings_FindUniqueArgs = Prisma.ChannelSettingsFindUniqueArgs;
export type ChannelSettings_UpdateArgs = Prisma.ChannelSettingsUpdateArgs;
export type ChannelSettings_UpdateManyArgs = Prisma.ChannelSettingsUpdateManyArgs;

export class ChannelSettingsManager extends Manager<
  ChannelSettings_Extended,
  ChannelSettings_FindUniqueArgs,
  ChannelSettings_FindManyArgs,
  ChannelSettings_CreateArgs,
  ChannelSettings_CreateManyArgs,
  ChannelSettings_UpdateArgs,
  ChannelSettings_UpdateManyArgs,
  ChannelSettings_DeleteArgs,
  ChannelSettings_DeleteManyArgs
> {
  public async findUnique(
    query: ChannelSettings_FindUniqueArgs
  ): Promise<ChannelSettings_Extended | null> {
    const data = await this.answer_overflow_client.prisma.channelSettings.findUnique(query);
    if (!data) return null;
    return new ChannelSettings_Extended(data, this);
  }
  public async findMany(query: ChannelSettings_FindManyArgs): Promise<ChannelSettings_Extended[]> {
    const data = await this.answer_overflow_client.prisma.channelSettings.findMany(query);
    return data.map((d) => new ChannelSettings_Extended(d, this));
  }
  public async create(query: ChannelSettings_CreateArgs): Promise<ChannelSettings_Extended> {
    const data = await this.answer_overflow_client.prisma.channelSettings.create(query);
    return new ChannelSettings_Extended(data, this);
  }
  public async createMany(query: ChannelSettings_CreateManyArgs): Promise<number> {
    const data = await this.answer_overflow_client.prisma.channelSettings.createMany(query);
    return data.count;
  }
  public async update(query: ChannelSettings_UpdateArgs): Promise<ChannelSettings_Extended> {
    const data = await this.answer_overflow_client.prisma.channelSettings.update(query);
    return new ChannelSettings_Extended(data, this);
  }
  public async updateMany(query: ChannelSettings_UpdateManyArgs): Promise<number> {
    const data = await this.answer_overflow_client.prisma.channelSettings.updateMany(query);
    return data.count;
  }
  public async delete(query: ChannelSettings_DeleteArgs): Promise<ChannelSettings_Extended> {
    const data = await this.answer_overflow_client.prisma.channelSettings.delete(query);
    return new ChannelSettings_Extended(data, this);
  }
  public async deleteMany(query: ChannelSettings_DeleteManyArgs): Promise<number> {
    const data = await this.answer_overflow_client.prisma.channelSettings.deleteMany(query);
    return data.count;
  }
}
