import { ChannelSettings } from "@prisma/client";
import { Create } from "../../primitives/create";
import { FindUnique, FindMany } from "../../primitives/find";
import { Manager } from "../../primitives/manager";
import { Update } from "../../primitives/update";
import { ChannelSettings_Extended } from "./channel-settings";
import { ChannelSettings_CreateCommand, ChannelSettings_CreateArgs } from "./create";
import {
  ChannelSettings_GetUniqueCommand,
  ChannelSettings_FindManyCommand,
  ChannelSettings_FindManyArgs,
  ChannelSettings_GetArgs,
} from "./find";
import { ChannelSettings_UpdateUniqueCommand } from "./update";

export class ChannelSettings_Manager
  extends Manager<ChannelSettings_Extended>
  implements
    FindUnique<ChannelSettings_GetUniqueCommand>,
    FindMany<ChannelSettings_FindManyCommand>,
    Create<ChannelSettings_CreateCommand>,
    Update<ChannelSettings_UpdateUniqueCommand, ChannelSettings_Extended>
{
  public async update(
    query: Partial<Omit<ChannelSettings, "channel_id">>,
    caller: ChannelSettings_Extended
  ): Promise<ChannelSettings_Extended> {
    return await new ChannelSettings_UpdateUniqueCommand(query, this, caller).execute();
  }
  public async create(query: ChannelSettings_CreateArgs): Promise<ChannelSettings_Extended> {
    return await new ChannelSettings_CreateCommand(query, this).execute();
  }
  public async findMany(args: ChannelSettings_FindManyArgs): Promise<ChannelSettings_Extended[]> {
    return await new ChannelSettings_FindManyCommand(args, this).execute();
  }
  public async get(args: ChannelSettings_GetArgs): Promise<ChannelSettings_Extended | null> {
    return await new ChannelSettings_GetUniqueCommand(args, this).execute();
  }
}
