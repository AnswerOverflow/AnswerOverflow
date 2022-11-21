import { Prisma, Channel } from "@prisma/client";
import { PrismaOperationTypeMap, TableManager } from "../../primitives/manager";
import { findOrCreate } from "../../utils/operations";

export type Channel_Mutable = Partial<Pick<Prisma.ChannelCreateInput, "name">>;

export type Channel_CreateInput = Pick<
  Prisma.ChannelUncheckedCreateInput,
  "id" | "name" | "type" | "server_id"
> &
  Channel_Mutable;

type ChannelDelegate = Prisma.ChannelDelegate<false>;

interface SafeChannelOperations
  extends PrismaOperationTypeMap<Channel, ChannelDelegate, Channel_CreateInput, Channel_Mutable> {}

export class ChannelManager extends TableManager<ChannelDelegate, SafeChannelOperations> {
  public async findCreate(input: Channel_CreateInput): Promise<Channel> {
    return findOrCreate(
      () => this.findUnique({ where: { id: input.id } }),
      () => this.create({ data: input })
    );
  }
}
